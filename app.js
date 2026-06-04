// ===== CONSTANTS =====

const CATEGORIES = [
    'Job / Income',
    'Rent / Debt',
    'Car / Assets',
    'Health / Gym',
    'Emotional Boundaries',
    'House / Stability',
    'Admin / Bills',
    'Business / Cybersecurity',
    'University',
    'Spiritual',
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const SLOT_LABELS = {
    major:   'Major Mission',
    medium1: 'Medium Task 1',
    medium2: 'Medium Task 2',
    non1:    'Non-Negotiable 1',
    non2:    'Non-Negotiable 2',
    non3:    'Non-Negotiable 3',
};

const SLOT_PLACEHOLDERS = {
    major:   'Your #1 most important task today',
    medium1: 'Medium task 1',
    medium2: 'Medium task 2',
    non1:    'Non-negotiable 1',
    non2:    'Non-negotiable 2',
    non3:    'Non-negotiable 3',
};

// Default non-negotiables injected by "Build Today For Me"
const DEFAULT_NON_NEG = [
    { text: 'Eat and hydrate properly today',              category: 'Health / Gym',  energy: 'low',    reducesStress: true },
    { text: 'Move your body — gym, walk, or stretch',      category: 'Health / Gym',  energy: 'medium', reducesStress: true },
    { text: 'Spiritual grounding — prayer or quiet time',  category: 'Spiritual',      energy: 'low',    reducesStress: true },
];

const RECOVERY_STATE_GUIDANCE = {
    stable:       'System stable. Execute your daily plan consistently.',
    pressured:    'Under pressure. Prioritise income and debt actions first. Reduce other load.',
    overwhelmed:  'Overwhelmed. One task at a time. Use Emergency Reset if needed.',
    recovery:     'In recovery mode. Daily minimum standard only. Be gentle with yourself.',
    'deep-focus': 'Deep focus engaged. One mission. No distractions. Execute.',
};

// ===== STATE =====

let state = {
    inbox:      [],
    tasks:      [],
    jobs:       [],
    daily3:     { major: null, medium1: null, medium2: null, non1: null, non2: null, non3: null },
    weeklyMap:  {},
    reviews:    [],
    brainState: 'normal',
    recoveryState: 'stable',
    recoveryDashboard: {
        date: null,
        jobApps: 0,
        moneyAction: false,
        movement: false,
        emotionalBoundary: false,
        importantTask: false,
    },
};

let currentBreakdownId = null;
let breakdownSource    = 'inbox';
let timerInterval      = null;
let organisePreview    = []; // in-memory only, not persisted
let currentSubtasks    = []; // subtasks being edited in the breakdown modal
let currentJobId       = null;
let jobTagFilter              = '';
let jobSearchFilter           = '';
let jobSortOrder              = 'newest';
let lastSmartJobCaptureResult = null; // cleared after save or manual clear

// ===== STORAGE =====

function persist() {
    localStorage.setItem('scs_v1', JSON.stringify(state));
}

function hydrate() {
    const raw = localStorage.getItem('scs_v1');
    if (!raw) return;
    try {
        const stored = JSON.parse(raw);
        state = { ...state, ...stored };
        state.daily3 = {
            ...{ major: null, medium1: null, medium2: null, non1: null, non2: null, non3: null },
            ...(state.daily3 || {}),
        };
        state.brainState = state.brainState || 'normal';
        state.recoveryState = state.recoveryState || 'stable';
        state.jobs = state.jobs || [];
        state.recoveryDashboard = {
            date: null,
            jobApps: 0,
            moneyAction: false,
            movement: false,
            emotionalBoundary: false,
            importantTask: false,
            ...(state.recoveryDashboard || {}),
        };
    } catch (e) {
        console.warn('Could not parse stored data, starting fresh.');
    }
}

// ===== DATA EXPORT / IMPORT =====

function exportData() {
    const now  = new Date();
    const date = now.toISOString().slice(0, 10);
    const hhmm = now.toTimeString().slice(0, 5).replace(':', '');
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `stefan-recovery-os-backup-${date}-${hhmm}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    localStorage.setItem('last_backup_date', date);
    renderBackupStatus();
    showToast('Backup downloaded');
}

function importData() {
    const input  = document.createElement('input');
    input.type   = 'file';
    input.accept = '.json';
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = evt => {
            try {
                const data = JSON.parse(evt.target.result);
                if (!confirm('This will replace ALL current data with the backup. Continue?')) return;
                state = { ...state, ...data };
                state.daily3 = {
                    ...{ major: null, medium1: null, medium2: null, non1: null, non2: null, non3: null },
                    ...(state.daily3 || {}),
                };
                state.brainState     = state.brainState     || 'normal';
                state.recoveryState  = state.recoveryState  || 'stable';
                state.jobs           = state.jobs           || [];
                state.recoveryDashboard = {
                    date: null, jobApps: 0, moneyAction: false,
                    movement: false, emotionalBoundary: false, importantTask: false,
                    ...(state.recoveryDashboard || {}),
                };
                persist();
                document.body.dataset.mode = state.brainState;
                renderBrainStateBar();
                const activeTab = document.querySelector('.tab.active');
                if (activeTab) {
                    const renders = { dashboard: renderRecoveryDashboard, inbox: renderInbox, tasks: renderTasks, daily: renderDaily, weekly: renderWeekly, review: renderReview, jobs: renderJobs };
                    const fn = renders[activeTab.dataset.tab];
                    if (fn) fn();
                }
                showToast('Data imported successfully');
            } catch (_) {
                alert('Invalid backup file. Please select a valid JSON backup.');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// ===== UTILITIES =====

function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function esc(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2400);
}

function todayLabel() {
    return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

function todayDayName() {
    return new Date().toLocaleDateString('en-GB', { weekday: 'long' });
}

function getWeekLabel() {
    const now = new Date();
    const dow = now.getDay();
    const diff = dow === 0 ? -6 : 1 - dow;
    const mon = new Date(now); mon.setDate(now.getDate() + diff);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    return `${mon.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${sun.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

function getWeekKey() {
    const now = new Date();
    const dow = now.getDay();
    const diff = dow === 0 ? -6 : 1 - dow;
    const mon = new Date(now); mon.setDate(now.getDate() + diff);
    return mon.toISOString().slice(0, 10);
}

function calcPriority(task) {
    let score = 0;
    if (task.urgent) score += 3;
    if (task.makesMoney) score += 2;
    if (task.reducesStress) score += 1;
    if (task.isBlocker) score += 2;
    if (task.deadline) {
        const days = Math.ceil((new Date(task.deadline) - new Date()) / 86400000);
        if (days <= 2) score += 3;
        else if (days <= 7) score += 2;
        else score += 1;
    }
    if (score >= 4) return 'high';
    if (score >= 2) return 'medium';
    return 'low';
}

function getTask(id) {
    return state.tasks.find(t => t.id === id) || null;
}

function sortByPriority(arr) {
    const o = { high: 0, medium: 1, low: 2 };
    return [...arr].sort((a, b) => (o[a.priority] ?? 2) - (o[b.priority] ?? 2));
}

function todayKey() {
    return new Date().toISOString().slice(0, 10);
}

function isDoneToday(task) {
    return !!task.recurring && task.lastCompleted === todayKey();
}

function isRecurringToday(task) {
    if (!task.recurring || task.recurrenceActive === false) return false;
    const r = task.recurrence;
    if (!r || !r.days || r.days.length === 0) return false;
    return r.days.includes(todayDayName());
}

function recurrenceLabel(task) {
    if (!task.recurrence) return 'Daily';
    const t = task.recurrence.type;
    if (t === 'daily')    return 'Daily';
    if (t === 'weekdays') return 'Weekdays';
    if (t === 'weekly')   return `Weekly (${(task.recurrence.days || []).join(', ')})`;
    if (t === 'custom')   return (task.recurrence.days || []).join(', ');
    return 'Daily';
}

// ===== AI DETECTION ENGINE =====

function detectCategory(text) {
    const t = text.toLowerCase();
    if (/rent\b|arrear|landlord|owe\b|debt\b|backlog|mortgage/.test(t))                                                  return 'Rent / Debt';
    if (/\bjob\b|apply\b|application|interview|cv\b|resume|income|earn|salary|invoice|sell\b|money|afford|freelance|payment/.test(t)) return 'Job / Income';
    if (/assignment|university|uni\b|study|lecture|essay|module|exam|course|seminar|tutor/.test(t))                       return 'University';
    if (/\bcar\b|fiat|mot\b|bumper|tyre|tire|oil change|service\b|vehicle|brake|exhaust/.test(t))                        return 'Car / Assets';
    if (/clean|cleaning|house\b|room\b|garage|hoover|vacuum|tidy|organis|dishes|laundry|washing|clutter/.test(t))        return 'House / Stability';
    if (/\bgym\b|sleep|food|health|eat\b|exercise|run\b|walk\b|workout|diet|hydrat|water\b|push.?up|stretc/.test(t))     return 'Health / Gym';
    if (/monastery|prayer|confession|spiritual|church|fast\b|fasting|meditat|rosary|\bmass\b|devotion/.test(t))          return 'Spiritual';
    if (/boundary|conflict|emotion|toxic|protect.*clarity|mental.*pressure|relationship|partner|family/.test(t))         return 'Emotional Boundaries';
    if (/linkedin|client|website|cybersecurity|pentest|hack|portfolio|startup|business\b|youtube|video\b|content|creative/.test(t)) return 'Business / Cybersecurity';
    if (/uc\b|universal credit|bill\b|admin|account\b|form\b|email\b|nhs\b|hmrc|gov\b|tax\b|register/.test(t))          return 'Admin / Bills';
    return 'Admin / Bills';
}

function detectPriority(text) {
    const t = text.toLowerCase();
    if (/deadline|today\b|tomorrow\b|urgent|asap|mot\b|rent\b|uc\b|bill\b|money|income|client|assignment|overdue|late\b|immediate/.test(t)) return 'high';
    if (/someday|maybe\b|idea\b|later\b|future|cosmetic|optional|could\b|might\b|nice to have/.test(t)) return 'low';
    return 'medium';
}

function detectEnergy(text) {
    const t = text.toLowerCase();
    if (/gym|workout|exercise|run\b|walk\b|coding|code\b|build\b|assignment|essay|study|research|video.?edit|editing|design\b|write\b|writing|develop|thesis|deep work|creative|record\b|film\b/.test(t)) return 'high';
    if (/admin|email\b|call\b|check\b|log.?in|review\b|reply|message\b|pay\b|form\b|apply\b|fill\b|verify|confirm|quick|read\b|glance|scan|upload|submit/.test(t)) return 'low';
    return 'medium';
}

function detectUrgent(text) {
    return /deadline|today\b|tomorrow\b|urgent|asap|overdue|late\b|immediate|must\b|critical/.test(text.toLowerCase());
}

function detectMakesMoney(text) {
    return /income|sell\b|money|earn|invoice|client|salary|revenue|profit|freelance|payment/.test(text.toLowerCase());
}

function detectReducesStress(text) {
    return /gym|sleep|clean|organis|spiritual|prayer|meditat|walk\b|hydrat|eat\b|food\b|tidy|sort/.test(text.toLowerCase());
}

function suggestNextAction(text) {
    const t = text.toLowerCase();

    // Finance / Government
    if (/student finance|student loan|slc\b/.test(t))  return 'Log in to Student Finance, check your application status and upload any pending documents';
    if (/uc\b|universal credit/.test(t))                return 'Log in to UC, check messages, to-do list and your next payment date';
    if (/hmrc|self.?assessment|tax return/.test(t))     return 'Log in to HMRC gateway and check what is outstanding or due';
    if (/dvla|driving.?licen/.test(t))                  return 'Go to gov.uk and complete the next required step in the process';
    if (/nhs\b|gp\b|doctor|appointment/.test(t))        return 'Call the surgery or use the NHS app to book the next available slot';

    // Money / Sales
    if (/sell\b/.test(t))                               return 'Take 3 clear photos and write the listing title and price';
    if (/rent\b/.test(t))                               return 'Check your account balance and set a transfer reminder for the due date';
    if (/invoice/.test(t))                              return 'Open the invoice template, fill in client details and amount, then send';
    if (/bill\b|payment\b|\bpay\b/.test(t))             return 'Log in to the account, check the due date and exact amount owed';

    // Admin / Applications
    if (/form\b|application|apply\b/.test(t))           return 'Open the form, complete your name and contact details, save progress';
    if (/register\b|sign up|enrol/.test(t))             return 'Open the registration page and complete all required basic details';
    if (/email\b/.test(t))                              return 'Open your inbox, draft a one-paragraph reply and send it';
    if (/\bcall\b|\bphone\b/.test(t))                   return 'Write one sentence of what to say, then make the call immediately';
    if (/reply\b|message\b/.test(t))                    return 'Open the conversation and send a one-line response now';
    if (/upload\b|submit\b|send.*doc|document/.test(t)) return 'Locate the file, open the portal and upload it directly';

    // University / Study
    if (/assignment|essay|coursework/.test(t))          return 'Open the document, read the last paragraph you wrote and add the next section';
    if (/study|revision|revise/.test(t))                return 'Open your notes, pick one topic and read focused for 25 minutes';
    if (/exam|test\b/.test(t))                          return 'Write 5 flashcard questions from memory, then check your answers';
    if (/lecture|seminar|tutorial/.test(t))             return 'Open the slides and write a 3-bullet summary of the key concept';
    if (/research\b/.test(t))                           return 'Open one source, read it and write a 3-sentence summary of the key point';

    // Business / Digital
    if (/linkedin/.test(t))                             return 'Reply to 1 pending message or send 1 targeted connection request';
    if (/portfolio|website/.test(t))                    return 'Open the project, make one visible change and save it';
    if (/client/.test(t))                               return 'Send a brief progress update or check their last message';
    if (/pentest|hack\b|ctf\b|cybersec/.test(t))        return 'Set a 25-minute timer and complete the next specific challenge step';
    if (/freelance/.test(t))                            return 'Identify the next deliverable and complete one concrete piece of it';
    if (/plan\b|planning|schedule|weekly/.test(t))      return 'Open the Weekly Planner and assign tomorrow\'s tasks to specific days';

    // YouTube / Creative
    if (/thumbnail/.test(t))                            return 'Open Canva or Photoshop and complete the thumbnail design';
    if (/script|outline/.test(t))                       return 'Write the hook line and 3 bullet points for the video structure';
    if (/record\b|film\b/.test(t))                      return 'Set up the camera, check the lighting and record the first 2 minutes';
    if (/youtube|channel/.test(t))                      return 'Open the project and complete the next scene or edit section';
    if (/video\b|edit\b/.test(t))                       return 'Open the timeline, cut the next segment and export a clean version';

    // Car / Assets
    if (/bumper|paint\b|scratch|dent/.test(t))          return 'Clean the area with soapy water, tape the boundary and prep for paint';
    if (/mot\b/.test(t))                                return 'Call the garage, confirm the appointment date and what documents to bring';
    if (/insurance\b/.test(t))                          return 'Compare quotes on a comparison site and note the best option';
    if (/\bcar\b|fiat|service\b|oil\b|brake/.test(t))   return 'Book the service or repair appointment online or by calling the garage';

    // Health / Recovery
    if (/gym|workout|exercise/.test(t))                 return 'Put on gym clothes, pack your bag and leave the house now';
    if (/sleep\b/.test(t))                              return 'Set phone to do-not-disturb, place it across the room and set your alarm';
    if (/food\b|eat\b|meal|cook/.test(t))               return 'Decide exactly what to make and take out the first ingredient';
    if (/walk\b|run\b/.test(t))                         return 'Put your shoes on, open the door and start — distance does not matter';
    if (/meditat/.test(t))                              return 'Set a 5-minute timer, close your eyes and focus only on your breathing';
    if (/stretch|physio/.test(t))                       return 'Roll out the mat, set a 10-minute timer and begin';

    // Spiritual
    if (/prayer|church|mass\b|rosary|confession/.test(t)) return 'Sit quietly, put the phone down and begin — 5 minutes is always enough';
    if (/spiritual|devotion|fast/.test(t))              return 'Sit in silence for 5 minutes with no screen and no interruptions';

    // House
    if (/hoover|vacuum/.test(t))                        return 'Get the hoover out and do one room only — do not expand the scope';
    if (/laundry|washing/.test(t))                      return 'Load the machine, select the correct cycle and press start';
    if (/dishes|washing up/.test(t))                    return 'Fill the sink and wash everything — takes under 10 minutes';
    if (/clean|tidy/.test(t))                           return 'Pick one small surface or area only — set a 15-minute timer';
    if (/organis|declutter/.test(t))                    return 'Set a 15-minute timer and sort one drawer or box only';

    return 'Identify the first physical step, set a 10-minute timer and begin';
}

function detectTaskType(text) {
    const t = text.toLowerCase();
    if (/deadline|overdue|urgent|asap|eviction|bailiff|court\b|critical/.test(t)) return 'Emergency';
    if (/income|sell\b|invoice|client.*pay|payment.*due|revenue|salary/.test(t))   return 'Money';
    if (/assignment|essay|study|coding|code\b|build\b|research|thesis|deep work|design\b|write\b|develop/.test(t)) return 'Deep Work';
    if (/youtube|linkedin|portfolio|startup|brand|marketing|pitch|channel|creative/.test(t)) return 'Strategic';
    if (/clean|tidy|hoover|laundry|dishes|organis|repair|fix\b|service\b|maintain/.test(t)) return 'Maintenance';
    if (/gym|sleep|rest\b|eat\b|food\b|exercise|walk\b|run\b|hydrat|recover|meditat|prayer|spiritual/.test(t)) return 'Recovery';
    if (/quick|simple|5 min|two min|reply\b|check\b/.test(t)) return 'Quick Win';
    if (/admin|form\b|register|apply\b|email\b|call\b|phone\b|bill\b|tax\b|hmrc|gov\b|nhs\b/.test(t)) return 'Admin';
    return 'Admin';
}

function detectEstimatedTime(text, taskType) {
    const t = text.toLowerCase();
    if (/quick reply|check balance|verify|confirm.*date|2 min|two min|one reply|one message/.test(t)) return '2 min';
    if (/email\b|reply\b|message\b|check\b|log.?in|pay\b|review\b|upload\b|submit\b/.test(t))        return '10 min';
    if (/call\b|phone\b|form\b|apply\b|clean\b|tidy\b|admin|appointment|register\b/.test(t))          return '30 min';
    if (/gym|workout|exercise|run\b|drive\b|install|set.?up|cook\b|walk\b/.test(t))                   return '1 hour';
    if (/assignment|essay|edit\b|build\b|code\b|develop|design\b|write\b|study|research|film\b|record\b/.test(t)) return '2+ hours';
    if (taskType === 'Emergency' || taskType === 'Quick Win') return '10 min';
    if (taskType === 'Admin') return '30 min';
    if (taskType === 'Deep Work' || taskType === 'Strategic') return '2+ hours';
    if (taskType === 'Maintenance') return '30 min';
    if (taskType === 'Recovery') return '1 hour';
    return '30 min';
}

function detectBlocker(text) {
    const t = text.toLowerCase();
    return /before i can|must.*first|first.*step|prerequisite|blocking\b|waiting on|can.?t.*(until|before)|holding.*back|need to.*first|depends on/.test(t);
}

function autoAnalyse(text) {
    const priority = detectPriority(text);
    const urgent   = detectUrgent(text);
    const taskType = detectTaskType(text);
    return {
        category:      detectCategory(text),
        priority:      priority,
        energy:        detectEnergy(text),
        urgent:        urgent,
        makesMoney:    detectMakesMoney(text),
        reducesStress: detectReducesStress(text),
        nextAction:    suggestNextAction(text),
        taskType,
        estimatedTime: detectEstimatedTime(text, taskType),
        isBlocker:     detectBlocker(text),
    };
}

// ===== SUBTASK SUGGESTIONS =====

// Returns true if the lowercased text contains any of the given keyword strings.
function _hasAny(t, keywords) {
    return keywords.some(kw => t.includes(kw));
}

function suggestSubtasks(text) {
    const t = text.toLowerCase();
    let category = 'generic';

    // --- Keyword pools ---
    const CAR_WORDS    = ['car', 'vehicle', 'fiat', 'van', 'auto', 'motors'];
    const PHOTO_WORDS  = ['photo', 'pic', 'picture', 'image', 'snap', 'shoot', 'footage'];
    const SELL_WORDS   = ['sell', 'selling', 'listing', 'listed', 'list car', 'advert',
                          'for sale', 'marketplace', 'gumtree', 'autotrader', 'ebay', 'facebook'];
    const BUMPER_WORDS = ['bumper', 'dent', 'respray', 'body repair', 'bodywork', 'body work'];

    const hasCar    = _hasAny(t, CAR_WORDS);
    const hasPhoto  = _hasAny(t, PHOTO_WORDS);
    const hasSell   = _hasAny(t, SELL_WORDS);
    const hasBumper = _hasAny(t, BUMPER_WORDS);
    // "car paint" / "paint car" / "scratch car" etc — but NOT 'car photo' (handled above)
    const hasCarPaint = hasCar && _hasAny(t, ['paint', 'scratch', 'dent', 'repair']);

    // Priority order: most specific first
    if (hasBumper || hasCarPaint) {
        category = 'bumper-paint';
    } else if ((hasCar && hasPhoto) || (hasCar && hasSell) ||
               _hasAny(t, ['vehicle listing', 'vehicle photo', 'car listing',
                            'car photos', 'car pictures', 'car images', 'car pics'])) {
        category = 'car-photos';
    } else if (_hasAny(t, ['student finance', 'student loan', 'slc', 'student funding'])) {
        category = 'student-finance';
    } else if (_hasAny(t, ['universal credit', 'uc account', 'uc journal', 'uc payment',
                            'uc check', 'check uc', 'open uc']) || /\buc\b/.test(t)) {
        category = 'uc';
    } else if (_hasAny(t, ['youtube', 'video edit', 'edit video', 'vlog', 'youtube video',
                            'record video', 'film video', 'channel video'])) {
        category = 'youtube';
    } else if (_hasAny(t, ['linkedin', 'linked in'])) {
        category = 'linkedin';
    } else if (_hasAny(t, ['gym', 'workout', 'exercise', 'training session', 'weights', 'lifting'])) {
        category = 'gym';
    } else if (_hasAny(t, ['assignment', 'essay', 'coursework', 'dissertation', 'thesis',
                            'module work', 'study session', 'revision', 'uni work'])) {
        category = 'university';
    }

    console.log(`[Subtasks] input="${text}" | t="${t}" | category="${category}"`);

    // --- Subtask templates ---
    const TEMPLATES = {
        'car-photos': [
            { text: 'Quick wash if dirty',              estimatedTime: '10 min', completed: false },
            { text: 'Move car to open area with good light', estimatedTime: '5 min', completed: false },
            { text: 'Take front photos',                estimatedTime: '3 min',  completed: false },
            { text: 'Take rear photos',                 estimatedTime: '3 min',  completed: false },
            { text: 'Take both side photos',            estimatedTime: '3 min',  completed: false },
            { text: 'Take wheel photos',                estimatedTime: '3 min',  completed: false },
            { text: 'Take interior photos',             estimatedTime: '5 min',  completed: false },
            { text: 'Take dashboard and mileage photo', estimatedTime: '2 min',  completed: false },
            { text: 'Review and keep best photos',      estimatedTime: '5 min',  completed: false },
        ],
        'bumper-paint': [
            { text: 'Wash damaged area',                estimatedTime: '5 min',  completed: false },
            { text: 'Dry area thoroughly',              estimatedTime: '5 min',  completed: false },
            { text: 'Lightly sand damaged area',        estimatedTime: '10 min', completed: false },
            { text: 'Tape edges around damage',         estimatedTime: '5 min',  completed: false },
            { text: 'Apply first thin coat',            estimatedTime: '10 min', completed: false },
            { text: 'Let it dry completely',            estimatedTime: '30 min', completed: false },
            { text: 'Apply second coat if needed',      estimatedTime: '10 min', completed: false },
        ],
        'student-finance': [
            { text: 'Open Student Finance website',             estimatedTime: '2 min',  completed: false },
            { text: 'Log in',                                   estimatedTime: '2 min',  completed: false },
            { text: 'Check application status',                 estimatedTime: '5 min',  completed: false },
            { text: 'Check messages and evidence requests',     estimatedTime: '5 min',  completed: false },
            { text: 'Upload any missing documents',             estimatedTime: '10 min', completed: false },
            { text: 'Save confirmation or screenshot',          estimatedTime: '2 min',  completed: false },
        ],
        'uc': [
            { text: 'Open Universal Credit account',    estimatedTime: '2 min', completed: false },
            { text: 'Log in',                           estimatedTime: '2 min', completed: false },
            { text: 'Check journal',                    estimatedTime: '5 min', completed: false },
            { text: 'Check to-do list',                 estimatedTime: '5 min', completed: false },
            { text: 'Check payment section',            estimatedTime: '5 min', completed: false },
            { text: 'Write down any required action',   estimatedTime: '3 min', completed: false },
        ],
        'youtube': [
            { text: 'Open project in editor',           estimatedTime: '2 min',  completed: false },
            { text: 'Review current progress',          estimatedTime: '10 min', completed: false },
            { text: 'Finish next scene',                estimatedTime: '30 min', completed: false },
            { text: 'Add music and sound',              estimatedTime: '10 min', completed: false },
            { text: 'Export draft',                     estimatedTime: '5 min',  completed: false },
            { text: 'Review before posting',            estimatedTime: '5 min',  completed: false },
        ],
        'linkedin': [
            { text: 'Open LinkedIn inbox',                  estimatedTime: '2 min', completed: false },
            { text: 'Reply to 1 important message',         estimatedTime: '5 min', completed: false },
            { text: 'Send 1 useful connection request',     estimatedTime: '3 min', completed: false },
            { text: 'Comment on 1 relevant post',           estimatedTime: '3 min', completed: false },
        ],
        'gym': [
            { text: 'Get dressed',                      estimatedTime: '5 min',  completed: false },
            { text: 'Prepare water bottle',             estimatedTime: '2 min',  completed: false },
            { text: 'Leave the house',                  estimatedTime: '5 min',  completed: false },
            { text: 'Complete training session',        estimatedTime: '45 min', completed: false },
            { text: 'Shower and recover',               estimatedTime: '15 min', completed: false },
        ],
        'university': [
            { text: 'Open the assignment document',     estimatedTime: '2 min',  completed: false },
            { text: 'Read the brief or question',       estimatedTime: '10 min', completed: false },
            { text: 'Write the next section',           estimatedTime: '30 min', completed: false },
            { text: 'Add citation or reference',        estimatedTime: '5 min',  completed: false },
            { text: 'Proofread what you wrote',         estimatedTime: '5 min',  completed: false },
        ],
        'generic': [
            { text: 'Define the outcome clearly',       estimatedTime: '5 min',  completed: false },
            { text: 'Identify the first small action',  estimatedTime: '5 min',  completed: false },
            { text: 'Do 10 minutes of focused work',    estimatedTime: '10 min', completed: false },
            { text: 'Review what remains',              estimatedTime: '5 min',  completed: false },
        ],
    };

    const result = TEMPLATES[category];
    const usedFallback = category === 'generic';
    console.log(`[Subtasks] generator="${category}" | fallback=${usedFallback} | count=${result.length}`);
    return result.map(s => ({ ...s })); // always return fresh copies
}

// ===== SUBTASK MODAL MANAGEMENT =====

function renderSubtasksList() {
    const list = document.getElementById('bd-subtasks-list');
    if (!list) return;
    if (currentSubtasks.length === 0) {
        list.innerHTML = '<p class="subtask-empty">No subtasks yet.</p>';
        return;
    }
    list.innerHTML = currentSubtasks.map((s, i) => `
        <div class="subtask-row">
            <input type="checkbox" class="subtask-cb"${s.completed ? ' checked' : ''}>
            <input type="text" class="subtask-text-input" placeholder="Subtask description…">
            <input type="text" class="subtask-time-input" placeholder="e.g. 10 min">
            <button type="button" class="btn btn-ghost btn-sm" onclick="removeSubtask(${i})">&#x2715;</button>
        </div>
    `).join('');
    list.querySelectorAll('.subtask-row').forEach((row, i) => {
        const s    = currentSubtasks[i];
        const cb   = row.querySelector('.subtask-cb');
        const txt  = row.querySelector('.subtask-text-input');
        const time = row.querySelector('.subtask-time-input');
        txt.value  = s.text;
        time.value = s.estimatedTime || '';
        cb.addEventListener('change',  () => { currentSubtasks[i].completed    = cb.checked; });
        txt.addEventListener('input',  () => { currentSubtasks[i].text         = txt.value; });
        time.addEventListener('input', () => { currentSubtasks[i].estimatedTime = time.value; });
    });
}

function suggestSubtasksForBreakdown() {
    const text = document.getElementById('bd-task-name').textContent;
    if (currentSubtasks.length > 0 && !confirm('Replace existing subtasks with suggestions?')) return;
    currentSubtasks = suggestSubtasks(text);
    renderSubtasksList();
    showToast(`${currentSubtasks.length} subtasks suggested`);
}

function addSubtaskRow() {
    currentSubtasks.push({ text: '', estimatedTime: '', completed: false });
    renderSubtasksList();
    const inputs = document.querySelectorAll('#bd-subtasks-list .subtask-text-input');
    if (inputs.length) inputs[inputs.length - 1].focus();
}

function removeSubtask(i) {
    currentSubtasks.splice(i, 1);
    renderSubtasksList();
}

// ===== STRATEGIC INTELLIGENCE =====

function detectTier(task) {
    if (task.urgent || ['Job / Income', 'Rent / Debt', 'Survival / Money'].includes(task.category) || task.taskType === 'Emergency') return 1;
    if (task.makesMoney || task.taskType === 'Money') return 1;
    if (['Business / Cybersecurity', 'University', 'YouTube / Creative'].includes(task.category) ||
        task.taskType === 'Strategic' || task.taskType === 'Deep Work') return 2;
    if (['Health / Gym', 'House / Stability', 'House / Organisation', 'Admin / Bills', 'Car / Assets',
         'Emotional Boundaries', 'Relationships / Family', 'Spiritual'].includes(task.category) ||
        ['Maintenance', 'Recovery', 'Admin'].includes(task.taskType)) return 3;
    return 4;
}

function detectWhyMatters(task) {
    const cat  = task.category  || '';
    const type = task.taskType  || detectTaskType(task.text || '');
    if (type === 'Emergency' || task.urgent)
        return 'This task demands immediate attention — delay increases risk or cost.';
    if (['Job / Income', 'Rent / Debt', 'Survival / Money'].includes(cat) || type === 'Money' || task.makesMoney)
        return 'This task directly protects or generates income. It is non-negotiable.';
    if (cat === 'University')
        return 'This task advances your academic standing and long-term credentials.';
    if (cat === 'Business / Cybersecurity' && type === 'Strategic')
        return 'This task builds skills or assets that compound into future opportunities.';
    if (cat === 'Business / Cybersecurity')
        return 'This task develops the professional foundation your career depends on.';
    if (cat === 'YouTube / Creative')
        return 'This task creates content that builds your audience and income potential.';
    if (cat === 'Health / Gym')
        return 'This task protects your energy and resilience — without it, everything else suffers.';
    if (cat === 'Spiritual')
        return 'This task builds the calm and groundedness required to perform at your best.';
    if (['House / Stability', 'House / Organisation'].includes(cat))
        return 'This task removes daily environmental friction that quietly drains focus.';
    if (cat === 'Emotional Boundaries')
        return 'This task protects your mental clarity from destabilisation. Execution depends on it.';
    if (cat === 'Car / Assets')
        return 'This task protects an asset that enables your freedom and income.';
    if (cat === 'Admin / Bills')
        return 'This task prevents small admin from compounding into a financial or legal problem.';
    if (cat === 'Relationships / Family')
        return 'This task invests in relationships that sustain your long-term wellbeing.';
    if (task.reducesStress)
        return 'Completing this reduces background anxiety and frees up mental bandwidth.';
    if (task.isBlocker)
        return 'This task is blocking progress on other work. Remove this blocker first.';
    return 'Incomplete tasks carry invisible weight. Finishing this clears mental space.';
}

// ===== TAB NAVIGATION =====

function switchTab(name) {
    document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    document.querySelectorAll('.tab-content').forEach(s => s.classList.toggle('active', s.id === `tab-${name}`));
    const renders = { dashboard: renderRecoveryDashboard, inbox: renderInbox, tasks: renderTasks, daily: renderDaily, weekly: renderWeekly, review: renderReview, jobs: renderJobs };
    if (renders[name]) renders[name]();
}

// ===== BRAIN DUMP INBOX =====

function processDump() {
    const el = document.getElementById('dump-input');
    const raw = el.value.trim();
    if (!raw) return;
    const items = raw.split(/[,\n;]+/).map(s => s.trim()).filter(Boolean);
    items.forEach(text => state.inbox.push({ id: uid(), text }));
    el.value = '';
    persist();
    renderInbox();
    showToast(`${items.length} item${items.length > 1 ? 's' : ''} added to inbox`);
}

function renderInbox() {
    const list = document.getElementById('inbox-list');
    const organiseBtn = document.getElementById('organise-btn');
    organiseBtn.style.display = state.inbox.length > 0 ? '' : 'none';

    if (state.inbox.length === 0) {
        list.innerHTML = `<div class="empty-state"><div class="empty-icon">📥</div><p>Nothing in the queue. When thoughts, tasks, or worries surface, add them here — then organise when you're ready.</p></div>`;
        return;
    }
    list.innerHTML = state.inbox.map(item => `
        <div class="task-card pri-inbox">
            <div class="priority-bar"></div>
            <div class="task-body">
                <div class="task-text">${esc(item.text)}</div>
            </div>
            <div class="task-actions">
                <button class="btn btn-primary btn-sm" onclick="openBreakdown('${item.id}','inbox')">Break Down</button>
                <button class="btn btn-ghost btn-sm" onclick="deleteInboxItem('${item.id}')" title="Remove">&#x2715;</button>
            </div>
        </div>
    `).join('');
}

function deleteInboxItem(id) {
    state.inbox = state.inbox.filter(i => i.id !== id);
    persist();
    renderInbox();
}

// ===== SMART ORGANISE =====

function organiseInbox() {
    if (state.inbox.length === 0) { showToast('Inbox is empty. Add tasks first.'); return; }
    organisePreview = state.inbox.map(item => ({ ...item, ...autoAnalyse(item.text) }));
    renderOrganiseModal();
    showModal('organise-modal');
}

function renderOrganiseModal() {
    const subtitle = document.getElementById('organise-subtitle');
    const list     = document.getElementById('organise-list');

    if (organisePreview.length === 0) { closeOrganise(); return; }
    subtitle.textContent = `I found ${organisePreview.length} task${organisePreview.length > 1 ? 's' : ''}. Here's what I think — review and accept.`;

    list.innerHTML = organisePreview.map(p => {
        const flags = [];
        if (p.urgent)        flags.push(`<span class="tag tag-urgent">Urgent</span>`);
        if (p.makesMoney)    flags.push(`<span class="tag tag-money">$ Money</span>`);
        if (p.reducesStress) flags.push(`<span class="tag tag-low">Stress ↓</span>`);
        if (p.isBlocker)     flags.push(`<span class="tag tag-blocker">Blocker</span>`);
        const tierNum  = detectTier(p);
        const tierText = ['', 'T1 Survival', 'T2 Strategic', 'T3 Maintain', 'T4 Optional'][tierNum];
        return `
            <div class="org-card">
                <div class="org-card-text">${esc(p.text)}</div>
                <div class="org-card-meta">
                    <span class="tag tag-tier-${tierNum}">${tierText}</span>
                    <span class="tag tag-cat">${esc(p.category)}</span>
                    <span class="tag tag-${p.priority}">${p.priority}</span>
                    <span class="tag tag-type">${p.taskType || 'Admin'}</span>
                    <span class="tag tag-time">⏱ ${p.estimatedTime || '30 min'}</span>
                    <span class="tag tag-energy">${p.energy} energy</span>
                    ${flags.join('')}
                </div>
                <div class="org-card-action">${esc(p.nextAction)}</div>
                <div class="org-card-btns">
                    <button class="btn btn-primary btn-sm" onclick="acceptOrganisedItem('${p.id}')">Accept ✓</button>
                    <button class="btn btn-outline btn-sm" onclick="editOrganisedItem('${p.id}')">Edit</button>
                    <button class="btn btn-ghost btn-sm" onclick="skipOrganisedItem('${p.id}')">Skip</button>
                </div>
            </div>`;
    }).join('');
}

function acceptOrganisedItem(id) {
    const preview = organisePreview.find(p => p.id === id);
    if (!preview) return;
    const newTask = {
        id:            preview.id,
        text:          preview.text,
        category:      preview.category,
        priority:      preview.priority,
        energy:        preview.energy,
        urgent:        preview.urgent,
        makesMoney:    preview.makesMoney,
        reducesStress: preview.reducesStress,
        nextAction:    preview.nextAction,
        taskType:      preview.taskType,
        estimatedTime: preview.estimatedTime,
        isBlocker:     preview.isBlocker,
        outcome:       '',
        deadline:      '',
        completed:     false,
        lastCompleted: null,
        createdAt:     new Date().toISOString(),
    };
    state.tasks.push(newTask);
    state.inbox = state.inbox.filter(i => i.id !== id);
    organisePreview = organisePreview.filter(p => p.id !== id);
    persist();
    renderOrganiseModal();
}

function skipOrganisedItem(id) {
    organisePreview = organisePreview.filter(p => p.id !== id);
    renderOrganiseModal();
}

function editOrganisedItem(id) {
    const preview = organisePreview.find(p => p.id === id);
    if (!preview) return;
    // Pre-enrich the inbox item with detected values so breakdown modal shows them
    const inboxItem = state.inbox.find(i => i.id === id);
    if (inboxItem) {
        Object.assign(inboxItem, {
            category:     preview.category,
            nextAction:   preview.nextAction,
            urgent:       preview.urgent,
            makesMoney:   preview.makesMoney,
            reducesStress: preview.reducesStress,
            energy:       preview.energy,
        });
    }
    organisePreview = organisePreview.filter(p => p.id !== id);
    closeOrganise();
    openBreakdown(id, 'inbox');
}

function acceptAllOrganised() {
    const count = organisePreview.length;
    organisePreview.forEach(preview => {
        const newTask = {
            id:            preview.id,
            text:          preview.text,
            category:      preview.category,
            priority:      preview.priority,
            energy:        preview.energy,
            urgent:        preview.urgent,
            makesMoney:    preview.makesMoney,
            reducesStress: preview.reducesStress,
            nextAction:    preview.nextAction,
            taskType:      preview.taskType,
            estimatedTime: preview.estimatedTime,
            isBlocker:     preview.isBlocker,
            outcome:       '',
            deadline:      '',
            completed:     false,
            lastCompleted: null,
            createdAt:     new Date().toISOString(),
        };
        state.tasks.push(newTask);
        state.inbox = state.inbox.filter(i => i.id !== preview.id);
    });
    organisePreview = [];
    persist();
    closeOrganise();
    renderInbox();
    showToast(`${count} tasks organised and moved to Tasks`);
}

function closeOrganise() {
    hideModal('organise-modal');
}

// ===== BREAKDOWN MODAL =====

function openBreakdown(id, source) {
    currentBreakdownId = id;
    breakdownSource    = source;

    const item = source === 'inbox' ? state.inbox.find(i => i.id === id) : getTask(id);
    if (!item) return;

    document.getElementById('bd-task-name').textContent = item.text;
    document.getElementById('bd-outcome').value         = item.outcome    || '';
    document.getElementById('bd-next-action').value     = item.nextAction || '';
    document.getElementById('bd-urgent').checked        = !!item.urgent;
    document.getElementById('bd-money').checked         = !!item.makesMoney;
    document.getElementById('bd-stress').checked        = !!item.reducesStress;
    document.getElementById('bd-deadline').value        = item.deadline   || '';

    const energy = item.energy || 'medium';
    document.querySelector(`input[name="bd-energy"][value="${energy}"]`).checked = true;

    const catSel = document.getElementById('bd-category');
    catSel.innerHTML = CATEGORIES.map(c =>
        `<option value="${esc(c)}" ${item.category === c ? 'selected' : ''}>${esc(c)}</option>`
    ).join('');

    // Recurring fields
    const recurringCheck = document.getElementById('bd-recurring');
    recurringCheck.checked = !!item.recurring;
    toggleRecurrenceOptions(!!item.recurring);
    document.querySelectorAll('input[name="bd-day"]').forEach(cb => { cb.checked = false; });
    if (item.recurring && item.recurrence) {
        const recType = document.getElementById('bd-recurrence-type');
        recType.value = item.recurrence.type || 'daily';
        onRecurrenceTypeChange(recType.value);
        if (item.recurrence.days) {
            document.querySelectorAll('input[name="bd-day"]').forEach(cb => {
                cb.checked = item.recurrence.days.includes(cb.value);
            });
        }
    } else {
        document.getElementById('bd-recurrence-type').value = 'daily';
        onRecurrenceTypeChange('daily');
    }

    currentSubtasks = (item.subtasks || []).map(s => ({ ...s }));
    // Auto-suggest subtasks for new inbox items that don't have any yet
    if (source === 'inbox' && currentSubtasks.length === 0) {
        currentSubtasks = suggestSubtasks(item.text);
        console.log(`[Subtasks] Auto-suggested ${currentSubtasks.length} subtasks on task creation`);
    }
    renderSubtasksList();
    showModal('breakdown-modal');
}

function closeBreakdown() {
    hideModal('breakdown-modal');
    currentBreakdownId = null;
    currentSubtasks    = [];
}

function saveBreakdown() {
    if (!currentBreakdownId) return;

    const energy    = document.querySelector('input[name="bd-energy"]:checked');
    const recurring = document.getElementById('bd-recurring').checked;
    let recurrence  = null;
    if (recurring) {
        const recType = document.getElementById('bd-recurrence-type').value;
        let days;
        if (recType === 'daily') {
            days = [...DAYS];
        } else if (recType === 'weekdays') {
            days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        } else {
            days = Array.from(document.querySelectorAll('input[name="bd-day"]:checked')).map(cb => cb.value);
            if (days.length === 0) days = [todayDayName()];
        }
        recurrence = { type: recType, days };
    }

    // Auto-detect strategic fields from source text
    const srcItem    = breakdownSource === 'inbox'
        ? state.inbox.find(i => i.id === currentBreakdownId)
        : getTask(currentBreakdownId);
    const srcText    = srcItem?.text || '';
    const detType    = srcItem?.taskType     || detectTaskType(srcText);
    const detTime    = srcItem?.estimatedTime || detectEstimatedTime(srcText, detType);
    const detBlocker = srcItem?.isBlocker    ?? detectBlocker(srcText);

    const patch = {
        category:      document.getElementById('bd-category').value,
        outcome:       document.getElementById('bd-outcome').value.trim(),
        nextAction:    document.getElementById('bd-next-action').value.trim(),
        urgent:        document.getElementById('bd-urgent').checked,
        makesMoney:    document.getElementById('bd-money').checked,
        reducesStress: document.getElementById('bd-stress').checked,
        deadline:      document.getElementById('bd-deadline').value,
        energy:        energy ? energy.value : 'medium',
        recurring,
        recurrence,
        taskType:      detType,
        estimatedTime: detTime,
        isBlocker:     detBlocker,
        subtasks:      currentSubtasks.filter(s => s.text.trim()),
    };

    if (breakdownSource === 'inbox') {
        const inboxItem = state.inbox.find(i => i.id === currentBreakdownId);
        if (!inboxItem) return;
        const newTask = {
            id: currentBreakdownId, text: inboxItem.text, completed: false,
            createdAt: new Date().toISOString(), lastCompleted: null,
            recurrenceActive: recurring ? true : undefined,
            ...patch,
        };
        newTask.priority = calcPriority(newTask);
        state.tasks.push(newTask);
        state.inbox = state.inbox.filter(i => i.id !== currentBreakdownId);
        showToast('Task saved');
    } else {
        const task = getTask(currentBreakdownId);
        if (!task) return;
        const wasRecurring = !!task.recurring;
        Object.assign(task, patch);
        task.priority = calcPriority(task);
        if (recurring && !wasRecurring) {
            task.recurrenceActive = true;
            task.lastCompleted    = null;
        } else if (!recurring) {
            delete task.recurrenceActive;
            task.lastCompleted = null;
        }
        showToast('Task updated');
    }

    persist();
    closeBreakdown();
    renderInbox();
    if (document.getElementById('tab-tasks').classList.contains('active'))  renderTasks();
    if (document.getElementById('tab-daily').classList.contains('active'))  renderDaily();
    if (document.getElementById('tab-weekly').classList.contains('active')) renderWeekly();
}

// ===== TASKS TAB =====

function renderTasks() {
    const catSel = document.getElementById('filter-category');
    const priSel = document.getElementById('filter-priority');
    const catVal = catSel.value;
    const priVal = priSel.value;

    catSel.innerHTML = '<option value="">All Categories</option>' +
        CATEGORIES.map(c => `<option value="${esc(c)}" ${catVal === c ? 'selected' : ''}>${esc(c)}</option>`).join('');

    // Brain state notice
    const notice = document.getElementById('brain-state-notice');
    const noticeMap = {
        'low-energy':  { cls: 'notice-low-energy', msg: '⚡ Low Energy Mode — high-energy tasks are dimmed. Focus on lighter work.' },
        'emergency':   { cls: 'notice-emergency',  msg: '🔴 Crisis Mode — income, rent, and urgent tasks highlighted. Everything else waits.' },
        'deep-focus':  { cls: 'notice-deep-focus', msg: '🎯 Deep Focus Mode — check the overlay for your single mission.' },
    };
    const modeInfo = noticeMap[state.brainState];
    if (modeInfo) {
        notice.className = `brain-state-notice ${modeInfo.cls}`;
        notice.textContent = modeInfo.msg;
        notice.classList.remove('hidden');
    } else {
        notice.classList.add('hidden');
    }

    const pOrder = { high: 0, medium: 1, low: 2 };
    let active       = state.tasks.filter(t => !t.completed && !isDoneToday(t));
    let doneTodayArr = state.tasks.filter(t => isDoneToday(t));
    let done         = state.tasks.filter(t => t.completed);

    if (catVal) {
        active       = active.filter(t => t.category === catVal);
        doneTodayArr = doneTodayArr.filter(t => t.category === catVal);
    }
    if (priVal) {
        active       = active.filter(t => t.priority === priVal);
        doneTodayArr = doneTodayArr.filter(t => t.priority === priVal);
    }

    // Emergency mode: sort survival/urgent tasks to top
    if (state.brainState === 'emergency') {
        const emergencyCats = new Set(['Job / Income', 'Rent / Debt', 'Survival / Money', 'Admin / Bills']);
        active.sort((a, b) => {
            const aEmerg = (a.urgent || emergencyCats.has(a.category)) ? 0 : 1;
            const bEmerg = (b.urgent || emergencyCats.has(b.category)) ? 0 : 1;
            if (aEmerg !== bEmerg) return aEmerg - bEmerg;
            return (pOrder[a.priority] ?? 2) - (pOrder[b.priority] ?? 2);
        });
    } else {
        active.sort((a, b) => {
            const pa = pOrder[a.priority] ?? 2;
            const pb = pOrder[b.priority] ?? 2;
            if (pa !== pb) return pa - pb;
            if (a.deadline && b.deadline) return new Date(a.deadline) - new Date(b.deadline);
            if (a.deadline) return -1;
            if (b.deadline) return 1;
            return 0;
        });
    }

    const all = [...active, ...doneTodayArr, ...done];

    const list = document.getElementById('task-list');
    if (all.length === 0) {
        list.innerHTML = `<div class="empty-state"><div class="empty-icon">&#10003;</div><p>No tasks yet. Go to Inbox, add your thoughts, then organise them into tasks.</p></div>`;
        return;
    }
    list.innerHTML = all.map(t => taskCardHTML(t, true)).join('');
}

function taskCardHTML(task, showActions) {
    const pri       = task.priority || 'low';
    const en        = task.energy   || 'medium';
    const doneToday = isDoneToday(task);
    const taskType     = task.taskType     || detectTaskType(task.text || '');
    const estimatedTime = task.estimatedTime || detectEstimatedTime(task.text || '', taskType);
    const tier     = detectTier({ ...task, taskType });
    const tierText = ['', 'T1 Survival', 'T2 Strategic', 'T3 Maintain', 'T4 Optional'][tier];
    const whyText  = detectWhyMatters(task);

    const tags = [];
    tags.push(`<span class="tag tag-tier-${tier}">${tierText}</span>`);
    if (task.category)    tags.push(`<span class="tag tag-cat">${esc(task.category)}</span>`);
    if (task.taskType)    tags.push(`<span class="tag tag-type">${esc(taskType)}</span>`);
    tags.push(`<span class="tag tag-time">⏱ ${estimatedTime}</span>`);
    if (task.urgent)      tags.push(`<span class="tag tag-urgent">Urgent</span>`);
    if (task.makesMoney)  tags.push(`<span class="tag tag-money">$ Money</span>`);
    if (task.isBlocker)   tags.push(`<span class="tag tag-blocker">Blocker</span>`);
    if (task.deadline) {
        const d = new Date(task.deadline);
        tags.push(`<span class="tag tag-due">Due ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>`);
    }
    if (task.energy) tags.push(`<span class="tag tag-energy">${task.energy} energy</span>`);
    const dayAssigned = state.weeklyMap[task.id];
    if (dayAssigned) tags.push(`<span class="tag tag-day">${dayAssigned}</span>`);
    if (task.recurring) {
        if (task.recurrenceActive === false) {
            tags.push(`<span class="tag tag-paused">⏸ Paused</span>`);
        } else {
            tags.push(`<span class="tag tag-recurring">🔁 ${recurrenceLabel(task)}</span>`);
        }
    }

    let completeTitle, completeIcon;
    if (task.recurring && task.recurrenceActive !== false) {
        completeTitle = doneToday ? 'Undo for today' : 'Done for today';
        completeIcon  = doneToday ? '↩' : '✓';
    } else {
        completeTitle = task.completed ? 'Undo' : 'Complete';
        completeIcon  = task.completed ? '↩' : '✓';
    }

    const pauseBtn = task.recurring ? `
        <button class="btn btn-ghost btn-sm" onclick="toggleRecurrenceActive('${task.id}')"
            title="${task.recurrenceActive === false ? 'Resume' : 'Pause'}">${task.recurrenceActive === false ? '▶' : '⏸'}</button>` : '';

    const actions = showActions ? `
        <div class="task-actions">
            <button class="btn btn-outline btn-sm" onclick="openBreakdown('${task.id}','task')">Edit</button>
            <button class="btn btn-ghost btn-sm" onclick="toggleComplete('${task.id}')" title="${completeTitle}">${completeIcon}</button>
            ${pauseBtn}
            <button class="btn btn-ghost btn-sm" onclick="deleteTask('${task.id}')" title="Delete">&#x2715;</button>
        </div>` : '';

    const subtasks  = task.subtasks || [];
    const stDone    = subtasks.filter(s => s.completed).length;
    const stTotal   = subtasks.length;

    const isCritical = task.urgent || ['Job / Income', 'Rent / Debt', 'Survival / Money'].includes(task.category);
    const cardClasses = `task-card pri-${pri} energy-${en}${task.completed ? ' completed' : ''}${doneToday ? ' done-today' : ''}${isCritical ? ' cat-critical' : ''}`;
    return `
        <div class="${cardClasses}">
            <div class="priority-bar"></div>
            <div class="task-body">
                <div class="task-text">${esc(task.text)}</div>
                ${tags.length ? `<div class="task-meta">${tags.join('')}</div>` : ''}
                ${task.nextAction ? `<div class="task-next-action">Next: ${esc(task.nextAction)}</div>` : ''}
                ${stTotal ? `<div class="subtask-progress${stDone === stTotal ? ' all-done' : ''}">${stDone}/${stTotal} subtasks complete</div>` : ''}
                <details class="why-matters">
                    <summary>Why this matters</summary>
                    <p>${esc(whyText)}</p>
                </details>
            </div>
            ${actions}
        </div>`;
}

function toggleComplete(id) {
    const t = getTask(id);
    if (!t) return;
    if (t.recurring && t.recurrenceActive !== false) {
        const key = todayKey();
        t.lastCompleted = (t.lastCompleted === key) ? null : key;
    } else {
        t.completed = !t.completed;
    }
    persist();
    if (document.getElementById('tab-tasks').classList.contains('active'))  renderTasks();
    if (document.getElementById('tab-daily').classList.contains('active'))  renderDaily();
    if (document.getElementById('tab-weekly').classList.contains('active')) renderWeekly();
}

function toggleRecurrenceActive(id) {
    const t = getTask(id);
    if (!t || !t.recurring) return;
    t.recurrenceActive = (t.recurrenceActive !== false) ? false : true;
    persist();
    if (document.getElementById('tab-tasks').classList.contains('active')) renderTasks();
    if (document.getElementById('tab-daily').classList.contains('active')) renderDaily();
}

function deleteTask(id) {
    if (!confirm('Delete this task?')) return;
    state.tasks = state.tasks.filter(t => t.id !== id);
    Object.keys(state.daily3).forEach(slot => { if (state.daily3[slot] === id) state.daily3[slot] = null; });
    delete state.weeklyMap[id];
    persist();
    renderTasks();
}

// ===== DAILY 3 =====

function renderDaily() {
    document.getElementById('today-date').textContent = todayLabel();
    checkOverload();

    Object.keys(state.daily3).forEach(slot => {
        const el     = document.getElementById(`slot-${slot}`);
        if (!el) return;
        const taskId = state.daily3[slot];
        const task   = taskId ? getTask(taskId) : null;

        if (task) {
            el.innerHTML = `
                <span class="slot-task-name ${task.completed ? 'slot-done' : ''}">${esc(task.text)}</span>
                <div style="display:flex;gap:5px;flex-shrink:0">
                    <button class="btn btn-ghost btn-sm" onclick="toggleComplete('${task.id}')"
                        title="${task.completed ? 'Undo' : 'Done'}">${task.completed ? '↩' : '✓'}</button>
                    <button class="btn btn-ghost btn-sm" onclick="removeFromSlot('${slot}')" title="Remove">&#x2715;</button>
                </div>`;
        } else {
            el.innerHTML = `<span class="slot-placeholder">${esc(SLOT_PLACEHOLDERS[slot])}</span>`;
        }
    });

    renderDailySuggestions();
}

function checkOverload() {
    const highCount = state.tasks.filter(t => !t.completed && t.priority === 'high').length;
    document.getElementById('overload-warning').classList.toggle('hidden', highCount <= 3);
}

function renderDailySuggestions() {
    const occupied = new Set(Object.values(state.daily3).filter(Boolean));
    let pool = state.tasks.filter(t => {
        if (occupied.has(t.id)) return false;
        if (t.recurring) return isRecurringToday(t) && !isDoneToday(t);
        return !t.completed;
    });

    // Brain state filtering
    if (state.brainState === 'low-energy') {
        pool = pool.filter(t => t.energy !== 'high').concat(pool.filter(t => t.energy === 'high'));
    } else if (state.brainState === 'emergency') {
        const emergencyCats = new Set(['Job / Income', 'Rent / Debt', 'Survival / Money', 'Admin / Bills']);
        const urgent = pool.filter(t => t.urgent || emergencyCats.has(t.category));
        const rest   = pool.filter(t => !t.urgent && !emergencyCats.has(t.category));
        pool = [...urgent, ...rest];
    } else {
        pool = sortByPriority(pool);
    }

    pool = pool.slice(0, 10);
    const container = document.getElementById('daily-suggestions');

    if (pool.length === 0) {
        container.innerHTML = '<p class="empty-pool-msg">No tasks to assign yet. Add tasks via Inbox first, then return here to build your daily plan.</p>';
        return;
    }

    container.innerHTML = pool.map(task => `
        <div class="task-card pri-${task.priority || 'low'} energy-${task.energy || 'medium'}">
            <div class="priority-bar"></div>
            <div class="task-body">
                <div class="task-text">${esc(task.text)}</div>
                <div class="task-meta">
                    <span class="tag tag-${task.priority || 'low'}">${task.priority || 'low'}</span>
                    ${task.category ? `<span class="tag tag-cat">${esc(task.category)}</span>` : ''}
                    ${task.energy   ? `<span class="tag tag-energy">${task.energy} energy</span>` : ''}
                </div>
            </div>
            <div class="task-actions">
                <select class="btn btn-sm btn-outline" onchange="assignToSlot('${task.id}',this.value);this.value=''">
                    <option value="">Assign…</option>
                    ${Object.keys(SLOT_LABELS).map(s => `<option value="${s}">${esc(SLOT_LABELS[s])}</option>`).join('')}
                </select>
            </div>
        </div>
    `).join('');
}

function assignToSlot(taskId, slot) {
    if (!slot) return;
    state.daily3[slot] = taskId;
    persist();
    renderDaily();
}

function removeFromSlot(slot) {
    state.daily3[slot] = null;
    persist();
    renderDaily();
}

// ===== BUILD TODAY FOR ME (AUTO DAILY 3) =====

function buildTodayForMe() {
    const mode = state.brainState;
    let pool   = state.tasks.filter(t => {
        if (t.recurring) return isRecurringToday(t) && !isDoneToday(t);
        return !t.completed;
    });

    if (pool.length === 0) { showToast('No tasks available. Add tasks through the Inbox first.'); return; }

    // Filter pool by brain state
    if (mode === 'low-energy') {
        // Prefer low/medium energy; push high energy to back
        const light = pool.filter(t => t.energy !== 'high');
        const heavy = pool.filter(t => t.energy === 'high');
        pool = [...sortByPriority(light), ...sortByPriority(heavy)];
    } else if (mode === 'emergency') {
        const emergencyCats = new Set(['Job / Income', 'Rent / Debt', 'Survival / Money', 'Admin / Bills']);
        const urgent = sortByPriority(pool.filter(t => t.urgent || emergencyCats.has(t.category)));
        const rest   = sortByPriority(pool.filter(t => !t.urgent && !emergencyCats.has(t.category)));
        pool = [...urgent, ...rest];
    } else {
        pool = sortByPriority(pool);
    }

    const used      = new Set();
    const newDaily3 = { ...state.daily3 };

    // Major Mission — top priority task
    const major = pool.find(t => !used.has(t.id));
    if (major) { newDaily3.major = major.id; used.add(major.id); }

    // Medium tasks — next 2
    for (const slot of ['medium1', 'medium2']) {
        const pick = pool.find(t => !used.has(t.id));
        if (pick) { newDaily3[slot] = pick.id; used.add(pick.id); }
    }

    // Non-Negotiables — prefer health/spiritual, fallback to defaults
    const nonNegCats = new Set(['Health / Gym', 'Spiritual', 'Emotional Boundaries']);
    const nnPool = pool.filter(t => !used.has(t.id) && nonNegCats.has(t.category));
    const restPool = pool.filter(t => !used.has(t.id) && !nonNegCats.has(t.category));
    const nnSource = [...nnPool, ...restPool];

    for (const slot of ['non1', 'non2', 'non3']) {
        const fromPool = nnSource.find(t => !used.has(t.id));
        if (fromPool) {
            newDaily3[slot] = fromPool.id;
            used.add(fromPool.id);
        } else {
            // Create default non-negotiable task
            const idx = ['non1', 'non2', 'non3'].indexOf(slot);
            const def = DEFAULT_NON_NEG[idx];
            if (def) {
                const existing = state.tasks.find(t => t.text === def.text);
                if (existing) {
                    newDaily3[slot] = existing.id;
                } else {
                    const newTask = {
                        id: uid(), text: def.text, category: def.category, energy: def.energy,
                        priority: 'medium', urgent: false, makesMoney: false,
                        reducesStress: def.reducesStress, nextAction: '', outcome: '',
                        deadline: '', completed: false, createdAt: new Date().toISOString(),
                        isDefault: true,
                    };
                    state.tasks.push(newTask);
                    newDaily3[slot] = newTask.id;
                }
            }
        }
    }

    state.daily3 = newDaily3;
    persist();
    renderDaily();
    showToast('Daily Stabilisation built. Execute now.');
}

// ===== WEEKLY PLANNER =====

function renderWeekly() {
    const today = todayDayName();
    const grid  = document.getElementById('weekly-grid');

    grid.innerHTML = DAYS.map(day => {
        const dayTasks = state.tasks.filter(t => state.weeklyMap[t.id] === day && !t.completed);
        return `
            <div class="day-col">
                <div class="day-header ${day === today ? 'is-today' : ''}">${day.slice(0, 3)}</div>
                <div class="day-task-chips">
                    ${dayTasks.map(t => `
                        <div class="day-chip chip-${t.priority || 'low'}">
                            <span class="day-chip-text">${esc(t.text)}</span>
                            <button class="day-chip-remove" onclick="unassignDay('${t.id}')" title="Remove">&#x2715;</button>
                        </div>
                    `).join('')}
                </div>
            </div>`;
    }).join('');

    renderUnassigned();
}

function renderUnassigned() {
    const pool      = state.tasks.filter(t => !state.weeklyMap[t.id] && !t.completed);
    const container = document.getElementById('unassigned-list');

    if (pool.length === 0) {
        container.innerHTML = '<p style="color:var(--text-muted);font-size:0.88rem">All tasks assigned to days.</p>';
        return;
    }

    container.innerHTML = sortByPriority(pool).map(task => `
        <div class="task-card pri-${task.priority || 'low'}">
            <div class="priority-bar"></div>
            <div class="task-body">
                <div class="task-text">${esc(task.text)}</div>
                <div class="task-meta">
                    ${task.category ? `<span class="tag tag-cat">${esc(task.category)}</span>` : ''}
                    <span class="tag tag-${task.priority || 'low'}">${task.priority || 'low'}</span>
                </div>
            </div>
            <div class="task-actions">
                <select class="btn btn-sm btn-outline" onchange="assignDay('${task.id}',this.value);this.value=''">
                    <option value="">Assign day…</option>
                    ${DAYS.map(d => `<option value="${d}">${d}</option>`).join('')}
                </select>
            </div>
        </div>
    `).join('');
}

function assignDay(taskId, day) {
    if (!day) return;
    state.weeklyMap[taskId] = day;
    persist();
    renderWeekly();
}

function unassignDay(taskId) {
    delete state.weeklyMap[taskId];
    persist();
    renderWeekly();
}

// ===== AUTO PLAN WEEK =====

function autoPlanWeek() {
    const active = state.tasks.filter(t => !t.completed);
    if (active.length === 0) { showToast('No tasks to plan.'); return; }
    if (!confirm('This will replace your current weekly plan. Continue?')) return;

    state.weeklyMap = {};
    const dayLoad   = Object.fromEntries(DAYS.map(d => [d, 0]));
    const MAX       = 3;
    const assigned  = new Set();

    function tryAssign(task, preferred) {
        for (const day of preferred) {
            if (dayLoad[day] < MAX && !assigned.has(task.id)) {
                state.weeklyMap[task.id] = day;
                dayLoad[day]++;
                assigned.add(task.id);
                return true;
            }
        }
        return false;
    }

    const sorted    = sortByPriority(active);
    const spiritual = sorted.filter(t => t.category === 'Spiritual');
    const health    = sorted.filter(t => t.category === 'Health / Gym');
    const highPri   = sorted.filter(t => t.priority === 'high'  && !spiritual.includes(t) && !health.includes(t));
    const mediumPri = sorted.filter(t => t.priority === 'medium' && !spiritual.includes(t) && !health.includes(t));
    const lowPri    = sorted.filter(t => t.priority === 'low'   && !spiritual.includes(t) && !health.includes(t));

    // Spiritual → Sunday preferred
    spiritual.forEach(t => tryAssign(t, ['Sunday','Saturday','Friday','Thursday','Wednesday','Tuesday','Monday']));
    // Health → Saturday preferred
    health.forEach(t    => tryAssign(t, ['Saturday','Sunday','Friday','Monday','Tuesday','Wednesday','Thursday']));
    // High priority → early week
    highPri.forEach(t   => tryAssign(t, ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']));
    // Medium → mid week
    mediumPri.forEach(t => tryAssign(t, ['Wednesday','Tuesday','Thursday','Monday','Friday','Saturday','Sunday']));
    // Low → later week
    lowPri.forEach(t    => tryAssign(t, ['Friday','Thursday','Saturday','Sunday','Wednesday','Tuesday','Monday']));

    persist();
    renderWeekly();
    const count = Object.keys(state.weeklyMap).length;
    showToast(`${count} tasks planned across the week.`);
}

// ===== WEEKLY REVIEW =====

function renderReview() {
    document.getElementById('week-label').textContent = getWeekLabel();
    const key     = getWeekKey();
    const current = state.reviews.find(r => r.week === key);
    document.getElementById('rv-job-apps-week').value  = current?.jobAppsWeek   || '';
    document.getElementById('rv-finance').value        = current?.finance        || '';
    document.getElementById('rv-completed').value      = current?.completed      || '';
    document.getElementById('rv-avoidance').value      = current?.avoidance      || current?.avoided    || '';
    document.getElementById('rv-destabilised').value   = current?.destabilised   || current?.stressed   || '';
    document.getElementById('rv-boundaries').value     = current?.boundaries     || '';
    document.getElementById('rv-mission').value        = current?.mission        || current?.next       || '';
    renderPastReviews();
}

function saveReview() {
    const key   = getWeekKey();
    const entry = {
        week:          key,
        weekLabel:     getWeekLabel(),
        jobAppsWeek:   document.getElementById('rv-job-apps-week').value,
        finance:       document.getElementById('rv-finance').value,
        completed:     document.getElementById('rv-completed').value,
        avoidance:     document.getElementById('rv-avoidance').value,
        destabilised:  document.getElementById('rv-destabilised').value,
        boundaries:    document.getElementById('rv-boundaries').value,
        mission:       document.getElementById('rv-mission').value,
        savedAt:       new Date().toISOString(),
    };
    const idx = state.reviews.findIndex(r => r.week === key);
    if (idx >= 0) state.reviews[idx] = entry;
    else state.reviews.unshift(entry);
    persist();
    renderPastReviews();
    showToast('Review saved');
}

function renderPastReviews() {
    const key  = getWeekKey();
    const past = state.reviews.filter(r => r.week !== key);
    const container = document.getElementById('past-reviews');
    if (past.length === 0) { container.innerHTML = ''; return; }

    container.innerHTML = '<h3 class="past-reviews-heading">Past Reviews</h3>' + past.map(r => `
        <div class="past-review-card">
            <h4>${esc(r.weekLabel)}</h4>
            ${r.jobAppsWeek ? `<div class="review-q"><strong>Job applications</strong><p>${esc(r.jobAppsWeek)}</p></div>` : ''}
            ${r.finance      ? `<div class="review-q"><strong>Financial actions</strong><p>${esc(r.finance)}</p></div>` : ''}
            ${r.completed    ? `<div class="review-q"><strong>Completed</strong><p>${esc(r.completed)}</p></div>` : ''}
            ${(r.avoidance || r.avoided) ? `<div class="review-q"><strong>Biggest avoidance</strong><p>${esc(r.avoidance || r.avoided)}</p></div>` : ''}
            ${(r.destabilised || r.stressed) ? `<div class="review-q"><strong>Emotional destabilisation</strong><p>${esc(r.destabilised || r.stressed)}</p></div>` : ''}
            ${r.boundaries   ? `<div class="review-q"><strong>Boundaries protected</strong><p>${esc(r.boundaries)}</p></div>` : ''}
            ${(r.mission || r.next) ? `<div class="review-q"><strong>Next mission</strong><p>${esc(r.mission || r.next)}</p></div>` : ''}
        </div>
    `).join('');
}

// ===== BRAIN STATE =====

function setBrainState(newState) {
    state.brainState = newState;
    document.body.dataset.mode = newState;
    persist();
    renderBrainStateBar();
    updateDeepFocusOverlay();

    // Re-render active tab to apply mode changes
    const activeTab = document.querySelector('.tab.active');
    if (activeTab) {
        const renders = { dashboard: renderRecoveryDashboard, inbox: renderInbox, tasks: renderTasks, daily: renderDaily, weekly: renderWeekly, jobs: renderJobs };
        const fn = renders[activeTab.dataset.tab];
        if (fn) fn();
    }
}

function renderBrainStateBar() {
    document.querySelectorAll('.bs-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.state === state.brainState);
    });
}

function updateDeepFocusOverlay() {
    const overlay = document.getElementById('deep-focus-overlay');
    if (state.brainState !== 'deep-focus') {
        overlay.classList.add('hidden');
        return;
    }
    const major = state.daily3.major ? getTask(state.daily3.major) : null;
    document.getElementById('df-task-name').textContent   = major ? major.text : 'Go to Today\'s Plan and set your Major Mission first';
    document.getElementById('df-next-action').textContent = major?.nextAction || '';
    overlay.classList.remove('hidden');
}

// ===== EMERGENCY RESET =====

function openEmergency() {
    document.getElementById('emergency-tasks').value = '';
    document.getElementById('timer-display').classList.add('hidden');
    document.getElementById('start-timer-btn').classList.remove('hidden');
    document.getElementById('timer-count').textContent = '60';
    document.getElementById('timer-status').textContent = 'Breathe slowly…';
    if (timerInterval) clearInterval(timerInterval);
    showModal('emergency-modal');
}

function closeEmergency(saveItems) {
    if (saveItems) {
        const raw = document.getElementById('emergency-tasks').value.trim();
        if (raw) {
            const items = raw.split(/\n+/).map(s => s.replace(/^\d+[.)]\s*/, '').trim()).filter(Boolean);
            items.forEach(text => state.inbox.push({ id: uid(), text }));
            if (items.length) { persist(); showToast(`${items.length} task${items.length > 1 ? 's' : ''} added to inbox`); }
        }
        if (document.getElementById('tab-inbox').classList.contains('active')) renderInbox();
    }
    hideModal('emergency-modal');
    if (timerInterval) clearInterval(timerInterval);
}

function startBreathingTimer() {
    let count = 60;
    document.getElementById('start-timer-btn').classList.add('hidden');
    document.getElementById('timer-display').classList.remove('hidden');
    document.getElementById('timer-count').textContent = count;

    timerInterval = setInterval(() => {
        count--;
        document.getElementById('timer-count').textContent = count;
        if (count <= 0) {
            clearInterval(timerInterval);
            document.getElementById('timer-count').textContent = '✓';
            document.getElementById('timer-status').textContent = 'Well done. You are calm.';
        }
    }, 1000);
}

// ===== RECURRENCE UI HELPERS =====

function toggleRecurrenceOptions(checked) {
    document.getElementById('bd-recurrence-options').style.display = checked ? 'block' : 'none';
}

function onRecurrenceTypeChange(value) {
    document.getElementById('bd-custom-days').style.display =
        (value === 'custom' || value === 'weekly') ? 'flex' : 'none';
}

// ===== HOW TO USE =====

function printHowTo() {
    document.body.classList.add('print-howto');
    window.print();
}

// ===== MODAL HELPERS =====

function showModal(id) {
    const m = document.getElementById(id);
    m.classList.add('open');
    m.setAttribute('aria-hidden', 'false');
}

function hideModal(id) {
    const m = document.getElementById(id);
    m.classList.remove('open');
    m.setAttribute('aria-hidden', 'true');
}

// ===== RECOVERY DASHBOARD =====

function getDashToday() {
    const today = todayKey();
    if (state.recoveryDashboard.date !== today) {
        state.recoveryDashboard = {
            date: today,
            jobApps: 0,
            moneyAction: false,
            movement: false,
            emotionalBoundary: false,
            importantTask: false,
        };
        persist();
    }
    return state.recoveryDashboard;
}

function renderRecoveryDashboard() {
    const d = getDashToday();

    // Today's Recovery Focus
    const major = state.daily3.major ? getTask(state.daily3.major) : null;
    const focusEl = document.getElementById('dash-focus-text');
    if (focusEl) {
        focusEl.textContent = major
            ? major.text
            : 'No major mission set — go to Today\'s Plan and assign one.';
        focusEl.classList.toggle('dash-focus-set', !!major);
    }

    // Job apps counter
    const jobCount = document.getElementById('dash-job-count');
    if (jobCount) {
        jobCount.textContent = `${d.jobApps} / 3`;
        jobCount.classList.toggle('counter-done', d.jobApps >= 3);
    }
    updateDashItem('dash-jobs', d.jobApps >= 3);

    // Toggle items
    updateDashToggle('dash-money-btn', d.moneyAction, 'Not done', 'Done');
    updateDashItem('dash-money-item', d.moneyAction);

    updateDashToggle('dash-movement-btn', d.movement, 'Not done', 'Done');
    updateDashItem('dash-movement-item', d.movement);

    updateDashToggle('dash-boundary-btn', d.emotionalBoundary, 'Not checked', 'Protected');
    updateDashItem('dash-boundary-item', d.emotionalBoundary);

    updateDashToggle('dash-task-btn', d.importantTask, 'Not done', 'Done');
    updateDashItem('dash-task-item', d.importantTask);

    // Recovery Score
    const score = [d.jobApps >= 3, d.moneyAction, d.movement, d.emotionalBoundary, d.importantTask].filter(Boolean).length;
    const scoreEl = document.getElementById('dash-score');
    if (scoreEl) {
        scoreEl.textContent = score;
        const scoreLine = document.getElementById('dash-score-line');
        if (scoreLine) scoreLine.classList.toggle('dash-score-perfect', score === 5);
    }

    // Recovery State
    const rs = state.recoveryState || 'stable';
    document.querySelectorAll('.rs-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.state === rs);
    });
    const guidanceEl = document.getElementById('rs-guidance');
    if (guidanceEl) guidanceEl.textContent = RECOVERY_STATE_GUIDANCE[rs] || '';
}

function updateDashToggle(id, done, labelOff, labelOn) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.textContent = done ? labelOn : labelOff;
    btn.className = 'btn btn-sm ' + (done ? 'btn-calm' : 'btn-outline');
}

function updateDashItem(id, done) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('dash-done', done);
}

function incrementJobApps() {
    getDashToday();
    if (state.recoveryDashboard.jobApps < 10) {
        state.recoveryDashboard.jobApps++;
        persist();
        renderRecoveryDashboard();
        if (state.recoveryDashboard.jobApps === 3) {
            showToast('3 job applications done. Daily target reached.');
        }
    }
}

function decrementJobApps() {
    getDashToday();
    if (state.recoveryDashboard.jobApps > 0) {
        state.recoveryDashboard.jobApps--;
        persist();
        renderRecoveryDashboard();
    }
}

function toggleDashCheck(field) {
    getDashToday();
    state.recoveryDashboard[field] = !state.recoveryDashboard[field];
    persist();
    renderRecoveryDashboard();
}

function setRecoveryState(rs) {
    state.recoveryState = rs;
    persist();
    renderRecoveryDashboard();
}

// ===== JOB RECOVERY =====

const JOB_STATUS_ORDER = { Offer: 0, Interview: 1, Applied: 2, Saved: 3, Rejected: 4 };

function applySortOrder(jobs, order) {
    const arr = [...jobs];
    // Stable timestamp key: ISO createdAt, falling back to id (lexicographic, newer ids are larger)
    const ts = j => j.createdAt || j.id || '';
    switch (order) {
        case 'oldest':        return arr.sort((a, b) => ts(a) < ts(b) ? -1 : ts(a) > ts(b) ? 1 : 0);
        case 'applied':       return arr.sort((a, b) => (JOB_STATUS_ORDER[a.status] ?? 3) - (JOB_STATUS_ORDER[b.status] ?? 3));
        case 'saved':         return arr.sort((a, b) => (a.status === 'Saved'     ? 0 : 1) - (b.status === 'Saved'     ? 0 : 1));
        case 'interview':     return arr.sort((a, b) => (a.status === 'Interview' ? 0 : 1) - (b.status === 'Interview' ? 0 : 1));
        case 'rejected-last': return arr.sort((a, b) => (a.status === 'Rejected'  ? 1 : 0) - (b.status === 'Rejected'  ? 1 : 0));
        case 'company-az':    return arr.sort((a, b) => (a.company || '').localeCompare(b.company || ''));
        case 'title-az':      return arr.sort((a, b) => (a.title   || '').localeCompare(b.title   || ''));
        case 'score-high':    return arr.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
        case 'newest':
        default:              return arr.sort((a, b) => ts(a) < ts(b) ? 1 : ts(a) > ts(b) ? -1 : 0);
    }
}

function renderJobs() {
    const d = getDashToday();
    const countEl = document.getElementById('job-daily-count');
    if (countEl) {
        countEl.textContent = `${d.jobApps} / 3`;
        countEl.classList.toggle('counter-done', d.jobApps >= 3);
    }
    const barEl = document.getElementById('job-daily-bar');
    if (barEl) {
        const pct = Math.min(100, Math.round((d.jobApps / 3) * 100));
        barEl.innerHTML = `<div class="job-daily-fill" style="width:${pct}%"></div>`;
    }

    renderJobStats();

    const statusFilter = document.getElementById('job-status-filter')?.value || '';
    let jobs = [...state.jobs];
    if (jobTagFilter)    jobs = jobs.filter(j => (j.tags || []).includes(jobTagFilter));
    if (statusFilter)    jobs = jobs.filter(j => j.status === statusFilter);
    if (jobSearchFilter) jobs = jobs.filter(j => jobMatchesTextFilter(j, jobSearchFilter));
    jobs = applySortOrder(jobs, jobSortOrder);

    const list = document.getElementById('job-list');
    if (!list) return;

    if (state.jobs.length === 0) {
        list.innerHTML = `<div class="empty-state"><div class="empty-icon">&#128188;</div><p>No jobs saved yet. Use Quick Capture above to add your first opportunity.</p></div>`;
        return;
    }
    if (jobs.length === 0) {
        list.innerHTML = `<div class="empty-state"><p>No jobs match the current filter. Clear filters to see all entries.</p></div>`;
        return;
    }
    list.innerHTML = jobs.map((j, i) => jobCardHTML(j, i + 1)).join('');
}

function jobCardHTML(j, num) {
    const tags = j.tags || [];
    const checklist = [
        { key: 'cvAdapted',           label: 'CV adapted' },
        { key: 'linkedinReviewed',    label: 'LinkedIn reviewed' },
        { key: 'coverLetterPrepared', label: 'Cover letter prepared' },
        { key: 'followUpPlanned',     label: 'Follow-up planned' },
        { key: 'applied',             label: 'Applied' },
    ];
    const doneCount = checklist.filter(c => j[c.key]).length;
    const today = todayKey();
    const isOverdue = j.followUpDate && j.followUpDate < today && j.status !== 'Rejected' && j.status !== 'Offer';

    // Duplicate-applied detection (render-time, never persisted)
    const selfApplied = j.status === 'Applied' || !!j.applied;
    let dupApplied = null;
    if (!selfApplied) {
        const m = getAppliedDuplicateMatch(j);
        if (m.level === 'exact' || m.level === 'high') dupApplied = m;
    }

    return `
<div class="job-card status-${j.status.toLowerCase()}${dupApplied ? ' job-card-duplicate-applied' : ''}" data-id="${esc(j.id)}">
    <div class="job-card-top">
        <div class="job-card-main">
            <div class="job-card-title">${num != null ? `<span class="job-card-num">#${num}</span>` : ''}${esc(j.title)}</div>
            <div class="job-card-meta">
                ${j.company ? `<span class="job-company">${esc(j.company)}</span>` : ''}
                ${j.location ? `<span class="job-location">📍 ${esc(j.location)}</span>` : ''}
                ${j.salary ? `<span class="job-salary">${esc(j.salary)}</span>` : ''}
            </div>
            <div class="job-card-badges">
                <span class="job-status-badge jstatus-${j.status.toLowerCase()}">${esc(j.status)}</span>
                <span class="job-match">&#9733; ${j.matchScore || 3}/5</span>
                ${tags.map(t => `<span class="job-tag">${esc(t)}</span>`).join('')}
                ${j.followUpDate ? `<span class="job-followup${isOverdue ? ' overdue' : ''}">&#128197; ${esc(j.followUpDate)}</span>` : ''}
            </div>
        </div>
        <div class="job-card-actions">
            ${j.url ? `<a href="${esc(j.url)}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-sm">&#8599;</a>` : ''}
            <button class="btn btn-outline btn-sm" onclick="openJobModal('${esc(j.id)}')">Edit</button>
            <button class="btn btn-ghost btn-sm" onclick="deleteJob('${esc(j.id)}')">&#x2715;</button>
        </div>
    </div>

    <div class="job-status-row">
        ${['Saved','Applied','Interview','Rejected','Offer'].map(s =>
            `<button class="job-status-pill${j.status === s ? ' active status-' + s.toLowerCase() : ''}" onclick="updateJobStatus('${esc(j.id)}','${s}')">${s}</button>`
        ).join('')}
    </div>

    ${dupApplied ? `
    <div class="job-duplicate-alert">
        <span class="job-duplicate-alert-title">&#9888; Likely duplicate &mdash; already applied before</span>
        ${dupApplied.reason ? `<span class="job-duplicate-alert-reason">${esc(dupApplied.reason)}</span>` : ''}
    </div>` : ''}

    <details class="job-checklist">
        <summary>CV Checklist <span class="checklist-count">${doneCount}/5</span></summary>
        <div class="job-checklist-items">
            ${checklist.map(c => `
                <label class="job-check-item${j[c.key] ? ' done' : ''}">
                    <input type="checkbox"${j[c.key] ? ' checked' : ''} onchange="toggleJobCheck('${esc(j.id)}','${c.key}',this.checked)">
                    <span>${c.label}</span>
                </label>`).join('')}
        </div>
    </details>

    ${j.notes ? `<div class="job-notes">${esc(j.notes)}</div>` : ''}
</div>`;
}

function quickAddJob() {
    const titleEl = document.getElementById('jq-title');
    const title   = titleEl?.value.trim();
    if (!title) { showToast('Enter a job title first'); return; }
    const company = document.getElementById('jq-company')?.value.trim() || '';
    const url     = document.getElementById('jq-url')?.value.trim() || '';

    // Duplicate protection for exact or high-probability matches
    const dup = getBestJobDuplicateMatch({ title, company, url, excludeId: null });
    if (dup.level === 'exact' || dup.level === 'high') {
        const dupMsg = `This looks like a job you already saved or applied for.\n\n"${dup.job.title}"${dup.job.company ? ' at ' + dup.job.company : ''} — ${dup.job.status}\n\nSave anyway?`;
        if (!confirm(dupMsg)) return;
    }

    // Enrich with Smart Job Capture result if it still matches what's in the fields
    const sjc   = lastSmartJobCaptureResult;
    const sjcOk = _sjcResultMatchesCapture(sjc, title, company);

    const job = {
        id:          uid(),
        title, company, url,
        salary:      sjcOk && sjc.salary   ? sjc.salary               : '',
        location:    sjcOk && sjc.location ? sjc.location             : '',
        status:      'Saved',
        matchScore:  sjcOk && sjc.score    ? sjc.score                : 3,
        notes:       sjcOk && sjc.note     ? sjc.note                 : '',
        followUpDate: '',
        tags:        sjcOk && sjc.tags && sjc.tags.length ? [...sjc.tags] : [],
        cvAdapted: false, linkedinReviewed: false,
        coverLetterPrepared: false, followUpPlanned: false, applied: false,
        createdAt:   new Date().toISOString(),
    };
    state.jobs.unshift(job);
    persist();
    lastSmartJobCaptureResult = null; // consumed — prevent stale reuse on next unrelated save
    titleEl.value = '';
    if (document.getElementById('jq-company')) document.getElementById('jq-company').value = '';
    if (document.getElementById('jq-url'))     document.getElementById('jq-url').value = '';
    const jqWarn = document.getElementById('jq-dup-warning');
    if (jqWarn) jqWarn.classList.add('hidden');
    renderJobs();
    showToast('Job saved');
}

function openJobModal(id) {
    currentJobId = id;
    const j = id ? state.jobs.find(j => j.id === id) : null;

    // For new jobs, read Quick Capture fields and check for a cached SJC result
    const isNew    = !id;
    const qTitle   = isNew ? (document.getElementById('jq-title')?.value.trim()   || '') : '';
    const qCompany = isNew ? (document.getElementById('jq-company')?.value.trim() || '') : '';
    const qUrl     = isNew ? (document.getElementById('jq-url')?.value.trim()     || '') : '';
    const sjc      = isNew ? lastSmartJobCaptureResult : null;
    const sjcOk    = isNew && _sjcResultMatchesCapture(sjc,
        qTitle   || (sjc?.title   || ''),
        qCompany || (sjc?.company || ''));

    document.getElementById('job-modal-title').textContent = id ? 'Edit Job Entry' : 'Add Job Entry';
    document.getElementById('jm-title').value     = j ? (j.title        || '') : (qTitle   || (sjcOk ? sjc.title   || '' : ''));
    document.getElementById('jm-company').value   = j ? (j.company      || '') : (qCompany || (sjcOk ? sjc.company || '' : ''));
    document.getElementById('jm-salary').value    = j ? (j.salary       || '') : (sjcOk ? sjc.salary   || '' : '');
    document.getElementById('jm-location').value  = j ? (j.location     || '') : (sjcOk ? sjc.location || '' : '');
    document.getElementById('jm-url').value       = j ? (j.url          || '') : (qUrl    || (sjcOk ? sjc.url     || '' : ''));
    document.getElementById('jm-status').value    = j ? (j.status       || 'Saved') : 'Saved';
    document.getElementById('jm-match').value     = j ? (j.matchScore   || 3)      : (sjcOk ? sjc.score || 3 : 3);
    document.getElementById('jm-followup').value  = j ? (j.followUpDate || '') : '';
    document.getElementById('jm-notes').value     = j ? (j.notes        || '') : (sjcOk ? sjc.note || '' : '');
    document.getElementById('jm-id').value        = id || '';

    const modalTags = j?.tags || (sjcOk ? (sjc.tags || []) : []);
    document.querySelectorAll('[name="jm-tag"]').forEach(cb => {
        cb.checked = modalTags.includes(cb.value);
    });

    const jmWarn = document.getElementById('jm-dup-warning');
    if (jmWarn) jmWarn.classList.add('hidden');
    showModal('job-modal');
}

function closeJobModal() {
    hideModal('job-modal');
    currentJobId = null;
    const jmWarn = document.getElementById('jm-dup-warning');
    if (jmWarn) jmWarn.classList.add('hidden');
}

function saveJobModal() {
    const title = document.getElementById('jm-title').value.trim();
    if (!title) { showToast('Job title is required'); return; }
    const tags = [...document.querySelectorAll('[name="jm-tag"]:checked')].map(cb => cb.value);
    const id   = document.getElementById('jm-id').value || uid();
    const jobData = {
        id, title,
        company:     document.getElementById('jm-company').value.trim(),
        salary:      document.getElementById('jm-salary').value.trim(),
        location:    document.getElementById('jm-location').value.trim(),
        url:         document.getElementById('jm-url').value.trim(),
        status:      document.getElementById('jm-status').value,
        matchScore:  parseInt(document.getElementById('jm-match').value, 10),
        followUpDate: document.getElementById('jm-followup').value,
        notes:       document.getElementById('jm-notes').value.trim(),
        tags,
    };
    const existing = state.jobs.find(j => j.id === id);
    if (existing) {
        Object.assign(existing, jobData);
    } else {
        state.jobs.unshift({
            ...jobData,
            cvAdapted: false, linkedinReviewed: false,
            coverLetterPrepared: false, followUpPlanned: false, applied: false,
            createdAt: new Date().toISOString(),
        });
    }
    persist();
    closeJobModal();
    renderJobs();
    showToast(existing ? 'Job updated' : 'Job added');
}

function deleteJob(id) {
    if (!confirm('Remove this job entry?')) return;
    state.jobs = state.jobs.filter(j => j.id !== id);
    persist();
    renderJobs();
    showToast('Job removed');
}

function updateJobStatus(id, status) {
    const j = state.jobs.find(j => j.id === id);
    if (!j) return;
    j.status = status;
    persist();
    renderJobs();
}

function toggleJobCheck(id, field, checked) {
    const j = state.jobs.find(j => j.id === id);
    if (!j) return;
    j[field] = checked;
    persist();
    const card = document.querySelector(`.job-card[data-id="${id}"]`);
    if (card) {
        const fields = ['cvAdapted','linkedinReviewed','coverLetterPrepared','followUpPlanned','applied'];
        const count = fields.filter(f => j[f]).length;
        const countEl = card.querySelector('.checklist-count');
        if (countEl) countEl.textContent = `${count}/5`;
        const row = card.querySelector(`input[onchange*="'${field}'"]`)?.closest('.job-check-item');
        if (row) row.classList.toggle('done', checked);
    }
    if (field === 'applied') renderJobStats();
}

function setJobTagFilter(tag) {
    jobTagFilter = tag;
    document.querySelectorAll('.jf-tag').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tag === tag);
    });
    renderJobs();
}

// ===== SMART JOB CAPTURE =====

// Keywords scored against pasted job text to suggest match level.
const SJC_HIGH_FIT = [
    'infrastructure', 'cloud', 'azure', 'microsoft 365', 'm365', 'entra id', 'intune',
    'active directory', 'identity', 'mfa', 'endpoint security', 'cybersecurity',
    'soc', 'siem', 'linux', 'docker', 'kubernetes', 'python', 'bash', 'powershell',
    'automation', 'devops', 'devsecops', 'networking', 'vpn', 'firewall', 'monitoring',
    'zabbix', 'grafana', 'support engineer', 'platform engineer', 'systems engineer',
    'site reliability', 'operations engineer', 'security engineer',
];

const SJC_MED_FIT = [
    'it support', 'help desk', 'helpdesk', 'service desk', 'windows server',
    'office 365', 'troubleshoot', 'server', 'vmware', 'virtualisation',
    'virtualization', 'network engineer', 'network administrator',
];

// Regex for lines that look like job title words
const SJC_TITLE_KW = /\b(engineer|analyst|administrator|support|infrastructure|cloud|cyber|security|devops|platform|technician|consultant|graduate|junior|senior|developer|manager|lead|architect|specialist|officer|soc|sre|systems?|network|operations|coordinator|helpdesk)\b/i;

// Lines that are clearly noise and should be skipped during extraction
const SJC_SKIP = /^(apply|easy\s*apply|posted|full.?time|part.?time|contract|permanent|remote|hybrid|on.?site|united\s*kingdom|england|linkedin|about\s*(the\s*)?job|about\s*(the\s*)?company|save|share|report|follow|connect|message|promoted|quick\s*apply|actively\s*(recruiting|hiring)|responses?\s+managed|response\s+managed|your\s+profile|show\s+match|is\s+this\s+information|\bbeta\b|company\s+logo|\d+\s*(applicant|view|follower|day|hour|month|year|connection)|\d+\+?\s*(employees|people))/i;

const SJC_LOCATION_KW = /\b(london|essex|colchester|cambridge|bristol|manchester|birmingham|edinburgh|glasgow|leeds|sheffield|newcastle|liverpool|oxford|reading|york|cardiff|coventry|nottingham|southampton|brighton|norwich|uk|united kingdom|england|remote|hybrid|on.?site)\b/i;

function extractJobTitle(lines) {
    // First pass: prefer lines with known job-title words
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line || line.length < 4 || line.length > 100) continue;
        if (SJC_SKIP.test(line)) continue;
        if (/^\d/.test(line)) continue;
        if (SJC_TITLE_KW.test(line)) return { title: line, titleIndex: i };
    }
    // Fallback: first short clean non-numeric line
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line || line.length < 4 || line.length > 80) continue;
        if (SJC_SKIP.test(line)) continue;
        if (/^[\d\W]+$/.test(line)) continue;
        return { title: line, titleIndex: i };
    }
    return { title: null, titleIndex: -1 };
}

// Returns true only for strings that look like a proper company name.
// Rejects sentence fragments, metadata lines, and long descriptive text.
function isLikelyCompanyName(line) {
    if (!line || line.length < 2 || line.length > 60) return false;

    const words = line.trim().split(/\s+/);
    if (words.length > 6) return false;

    // Must not end with sentence punctuation
    if (/[.,:;]$/.test(line)) return false;

    // Must not contain separator characters (these are compound metadata lines)
    if (/[·•|]/.test(line)) return false;

    // Reject single-word work-type or employment-type tokens
    if (/^(remote|hybrid|on.?site|full.?time|part.?time|contract|permanent|volunteer)$/i.test(line.trim())) return false;

    const t = line.toLowerCase();

    // Reject any line that mentions "linkedin" in a phrase — these are always metadata
    // (Exception: the company "LinkedIn" itself, which is just the word alone)
    if (/\blinkedin\b/i.test(t) && t.trim() !== 'linkedin') return false;

    // Reject if it contains any phrase that indicates a sentence or description
    const SENTENCE_PHRASES = [
        'such as', 'topics', 'sessions', 'responsibilities', 'requirements',
        'about the', 'the role', 'the job', 'we are', 'we offer', 'we provide',
        'featuring', 'increasing', 'delivering', 'driving', 'including',
        'psychology', 'leadership', 'engagement', 'personalisation',
        'people clicked', 'clicked apply', 'applicants', 'easy apply',
        'responses managed', 'managed off', 'your profile', 'show match',
        'is this information', 'missing information',
    ];
    if (SENTENCE_PHRASES.some(p => t.includes(p))) return false;

    // Reject salary and time metadata
    if (/£|\$|salary|per annum|gbp|\bago\b|\bposted\b|\bviews?\b|\bweeks?\b|\bdays?\b|\bmonths?\b/i.test(line)) return false;

    // At least one word must start with a capital letter (proper nouns)
    if (!/[A-Z]/.test(line)) return false;

    // Reject if too few words are capitalised — company names are proper nouns
    // e.g. "wide personal sessions" has 1/3 = 0.33 cap ratio → reject
    // Allow single-word companies (Accenture, Microsoft) and short names (BT Group)
    const capCount = words.filter(w => /^[A-Z]/.test(w)).length;
    if (words.length > 2 && capCount / words.length < 0.4) return false;

    return true;
}

function extractCompany(lines, titleIndex, text) {
    // Pattern 0: LinkedIn "Company logo for, COMPANY_NAME." — highest-confidence signal
    // The clean name usually appears on the very next line, so prefer that.
    const logoM = text.match(/company\s+logo\s+for[,\s]+([^\n.!,]{1,50})[.,!]?\s*\n?\s*([^\n]*)?/i);
    if (logoM) {
        const fromLogo  = logoM[1].trim().replace(/[.,!]+$/, '');
        const nextLine  = (logoM[2] || '').trim().replace(/[.,!]+$/, '');
        // Prefer clean next-line repeat of the same name (common LinkedIn layout)
        if (isLikelyCompanyName(nextLine) && nextLine.toLowerCase() === fromLogo.toLowerCase()) return nextLine;
        if (isLikelyCompanyName(nextLine)) return nextLine;
        if (isLikelyCompanyName(fromLogo)) return fromLogo;
    }

    // Pattern 1: labelled field "Company: X" anywhere in the text
    const labelM = text.match(/(?:company|employer|organisation|client)\s*[:\-]\s*([^\n,]{2,60})/i);
    if (labelM) {
        const candidate = labelM[1].trim();
        if (isLikelyCompanyName(candidate)) return candidate;
    }

    // Pattern 2: "X is hiring / recruiting"
    const hiringM = text.match(/^(.{2,60}?)\s+(?:is\s+)?(?:hiring|recruiting|looking for)/im);
    if (hiringM) {
        const candidate = hiringM[1].trim();
        if (isLikelyCompanyName(candidate)) return candidate;
    }

    // Pattern 3: lines BEFORE the detected title (LinkedIn often puts company name above the title)
    if (titleIndex > 0) {
        for (let i = titleIndex - 1; i >= Math.max(0, titleIndex - 5); i--) {
            const candidate = lines[i];
            if (!candidate) continue;
            if (SJC_SKIP.test(candidate)) continue;         // rejects "Company logo for…", "Apply", etc.
            if (SJC_LOCATION_KW.test(candidate)) continue;
            if (/^\d/.test(candidate)) continue;
            if (isLikelyCompanyName(candidate)) return candidate;
        }
    }

    // Pattern 4: lines immediately AFTER the detected title (other job board layouts)
    if (titleIndex >= 0) {
        for (let i = titleIndex + 1; i <= Math.min(titleIndex + 4, lines.length - 1); i++) {
            const candidate = lines[i];
            if (!candidate) continue;
            if (SJC_SKIP.test(candidate)) continue;
            if (SJC_LOCATION_KW.test(candidate)) continue;
            if (/^\d/.test(candidate)) continue;
            if (isLikelyCompanyName(candidate)) return candidate;
        }
    }

    return null;
}

function extractJobUrl(text) {
    const all = text.match(/https?:\/\/[^\s"'<>)\]]+/g) || [];
    if (!all.length) return null;
    const jobSite = all.find(u =>
        /linkedin\.com\/jobs|indeed\.com|reed\.co|totaljobs|cv-library|glassdoor|monster\.co|jobsite|simplyhired|adzuna|workday|greenhouse\.io|lever\.co|taleo|smartrecruiters|breezyhr/i.test(u)
    );
    return jobSite || all[0];
}

// Removes LinkedIn metadata phrases from location lines that contain "·".
// Keeps location text and work-mode words (Remote / Hybrid / On-site).
function cleanLinkedInLocationLine(line) {
    if (!line.includes('·')) return line.trim();

    const METADATA = /\b(ago|posted|applicant|clicked|apply|view|promoted|promoting|actively|recruiting|recruiting|early|first|among|be\s+an|week|day|month|hour|minute|over\s+\d+|^\d+)\b/i;

    const parts = line.split('·').map(p => p.trim()).filter(Boolean);
    const clean = parts.filter(p => !METADATA.test(p) && !/^\d+/.test(p));

    if (!clean.length) return line.trim();

    // Separate the geographic location from the work-type tag (Hybrid/Remote/On-site)
    const WORK_TYPE = /^\s*(remote|hybrid|on.?site)\s*$/i;
    const locParts  = clean.filter(p => !WORK_TYPE.test(p));
    const workParts = clean.filter(p => WORK_TYPE.test(p));

    const result = locParts.join(', ');
    return workParts.length ? `${result} · ${workParts[0]}` : result;
}

function extractJobLocation(lines) {
    for (const line of lines) {
        // Allow longer lines since LinkedIn location lines contain metadata we'll strip
        if (line.length < 2 || line.length > 300) continue;
        if (SJC_LOCATION_KW.test(line)) return cleanLinkedInLocationLine(line);
    }
    return null;
}

function extractJobSalary(text) {
    const patterns = [
        /£\s*[\d,]+\s*[kK]?\s*[-–—to]+\s*£?\s*[\d,]+\s*[kK]?(?:\s*(?:per annum|p\.a\.|\/yr|\/year|a year))?/i,
        /£\s*[\d,]+\s*[kK]?(?:\s*(?:per annum|p\.a\.|\/yr|\/year|a year))?/i,
        /(?:salary|package)\s*[:\-]?\s*£?\s*[\d,]+\s*[kK]?(?:\s*(?:per annum|p\.a\.))?/i,
        /up\s*to\s*£\s*[\d,]+\s*[kK]?/i,
        /\b\d{2,3}(?:,\d{3})?\s*[-–—]\s*\d{2,3}(?:,\d{3})?\s*GBP\b/i,
    ];
    for (const p of patterns) {
        const m = text.match(p);
        if (m) return m[0].trim();
    }
    return null;
}

function _sjcSalaryOver40k(salaryStr) {
    if (!salaryStr) return false;
    const kNums = salaryStr.match(/(\d+)\s*k/gi) || [];
    for (const km of kNums) {
        if (parseInt(km, 10) >= 40) return true;
    }
    const fullNums = salaryStr.match(/\d[\d,]{4,}/g) || [];
    for (const fn of fullNums) {
        if (parseInt(fn.replace(/,/g, ''), 10) >= 40000) return true;
    }
    return false;
}

// ---- Work mode & location fit ----

// Preferred commutable areas for Colchester/London base
const SJC_PREFERRED_LOC = /\b(colchester|essex|london|chelmsford|ipswich|cambridge|hertfordshire|hertford|watford|luton|norwich|suffolk|kent|stevenage|harlow|basildon|southend|brentwood|braintree|felixstowe|clacton)\b/i;

// Far / high-risk areas for regular commuting from Colchester/London
const SJC_RISK_LOC = /\b(newcastle|manchester|birmingham|bristol|leeds|liverpool|sheffield|scotland|wales|cardiff|edinburgh|glasgow|sunderland|durham|middlesbrough|york|bradford|hull|nottingham|leicester|coventry|derby|stoke|wolverhampton|swansea|aberdeen|dundee|belfast|gateshead|sunderland|teesside|tyne|wigan|blackpool|blackburn|preston|bolton|salford|oldham|rochdale)\b/i;

// Returns 'remote' | 'hybrid' | 'onsite' | 'unknown'
function detectWorkMode(text, location) {
    const combined = ((text || '') + ' ' + (location || '')).toLowerCase();
    // Hybrid beats bare "remote" (e.g. hybrid with some remote days)
    if (/\bhybrid\b|\d+\s*days?\s*(in\s*)?office|\d+\s*days?\s*a\s*week\s*(in\s*)?office|office\s+days|blended\s+working/.test(combined)) return 'hybrid';
    // Fully remote / work from home signals
    if (/\bfully\s+remote\b|\bwork\s+from\s+home\b|\bwfh\b|\bhome.?based\b|\bremote.?first\b|\bremote.?only\b|\bremote\b/.test(combined)) return 'remote';
    // On-site signals
    if (/\bon.?site\b|\boffice.?based\b|\bfull.?time\s+office\b/.test(combined)) return 'onsite';
    return 'unknown';
}

// Returns { level: 'ok'|'warning'|'blocked'|'unknown', label, message }
function assessLocationFit(location, workMode) {
    // Remote is always fine regardless of listed location
    if (workMode === 'remote') {
        return {
            level:   'ok',
            label:   'Remote OK',
            message: 'Fully remote or remote-friendly role. No commute risk.',
        };
    }

    if (!location || !location.trim()) {
        return {
            level:   'unknown',
            label:   'Unknown location',
            message: 'Location could not be confidently assessed.',
        };
    }

    const isPreferred = SJC_PREFERRED_LOC.test(location);
    const isRisk      = SJC_RISK_LOC.test(location);

    if (isRisk) {
        if (workMode === 'hybrid' || workMode === 'onsite') {
            return {
                level:   'blocked',
                label:   'Location Risk',
                message: 'LOCATION RISK — This role appears too far for regular hybrid/on-site commuting from Colchester/London.',
            };
        }
        // Unknown work mode but distant location
        return {
            level:   'warning',
            label:   'Location Risk',
            message: 'Location may be too far unless the role is fully remote. Verify work mode before applying.',
        };
    }

    if (isPreferred) {
        return {
            level:   'ok',
            label:   'Commute OK',
            message: 'Location appears suitable for Colchester/London target area.',
        };
    }

    return {
        level:   'unknown',
        label:   'Unknown location',
        message: 'Location could not be confidently assessed. Check if commuting is realistic.',
    };
}

function suggestJobTags(text, salary) {
    const t = text.toLowerCase();
    const tags = [];
    if (/\bhybrid\b/.test(t))           tags.push('Hybrid');
    else if (/\bremote\b/.test(t))      tags.push('Remote');
    else if (/\bon.?site\b/.test(t))    tags.push('On-site');
    if (_sjcSalaryOver40k(salary))      tags.push('£40k+');
    if (/\bcyber|cybersec|\bsoc\b|security operations/.test(t)) tags.push('Cybersecurity');
    else if (/it support|help.?desk|service.?desk|1st line|2nd line|first.?line/.test(t)) tags.push('IT Support');
    if (/\burgent\b|immediate start|\basap\b/.test(t)) tags.push('Urgent');
    return tags;
}

function suggestJobMatchScore(text) {
    const t     = text.toLowerCase();
    const high  = SJC_HIGH_FIT.filter(kw => t.includes(kw)).length;
    const med   = SJC_MED_FIT.filter(kw => t.includes(kw)).length;
    if (high >= 4 || (high >= 2 && med >= 3)) return 5;
    if (high >= 2 || (high >= 1 && med >= 2)) return 4;
    if (high >= 1 || med >= 2)                return 3;
    if (med  >= 1)                            return 2;
    return 1;
}

function buildSmartJobNote(score, locationFit) {
    // Location-blocked overrides normal note
    if (locationFit && locationFit.level === 'blocked') {
        return 'LOCATION RISK — This role appears too far for hybrid/on-site commuting from Colchester/London. Apply only if it is fully remote or relocation is realistic.';
    }

    const base = {
        5: 'HIGH PRIORITY — Strong alignment with cloud, infrastructure, security and automation. Apply promptly.',
        4: 'GOOD FIT — Relevant IT/infrastructure/security opportunity with solid exposure. Worth applying.',
        3: 'POSSIBLE FIT — Some overlap with IT/support skills. Review requirements carefully before applying.',
        2: 'LOW PRIORITY — Limited match with current direction. Apply only if time allows.',
        1: 'NOT RECOMMENDED — Minimal alignment with cloud/infrastructure/security background.',
    }[score] || 'POSSIBLE FIT — Some overlap with IT/support skills. Review requirements carefully.';

    if (locationFit && locationFit.level === 'warning') {
        return base + ' Note: check work mode carefully — location may be too far for non-remote roles.';
    }

    return base;
}

function parseSmartJobCaptureText(text) {
    const lines                 = text.split('\n').map(l => l.trim()).filter(Boolean);
    const { title, titleIndex } = extractJobTitle(lines);
    const company               = extractCompany(lines, titleIndex, text);
    const url                   = extractJobUrl(text);
    const location              = extractJobLocation(lines);
    const salary                = extractJobSalary(text);

    // Work mode & location fit (computed before score so we can cap it)
    const workMode    = detectWorkMode(text, location);
    const locationFit = assessLocationFit(location, workMode);

    // Base tags + location risk tag if warranted
    const tags = suggestJobTags(text, salary);
    if ((locationFit.level === 'blocked' || locationFit.level === 'warning') && !tags.includes('Location Risk')) {
        tags.push('Location Risk');
    }

    // Raw keyword score, then apply location cap
    let score = suggestJobMatchScore(text);
    if (locationFit.level === 'blocked') score = Math.min(score, 2);
    if (locationFit.level === 'warning') score = Math.min(score, 3);

    const note              = buildSmartJobNote(score, locationFit);
    const uncertainties     = [];
    if (!title)   uncertainties.push('Job title could not be confidently detected.');
    if (!company) uncertainties.push('Company name could not be confidently detected.');
    if (!url)     uncertainties.push('No URL found in the pasted text.');

    return { title, company, url, location, salary, tags, score, note, uncertainties, workMode, locationFit };
}

function renderSmartJobCapturePreview(result) {
    const container = document.getElementById('sjc-preview');
    if (!container) return;

    const row = (label, value, required = false) => {
        if (value) {
            return `<div class="sjc-row"><span class="sjc-label">${label}</span><span class="sjc-value">${esc(value)}</span></div>`;
        }
        if (required) {
            return `<div class="sjc-row"><span class="sjc-label">${label}</span><span class="sjc-value sjc-missing">Not detected</span></div>`;
        }
        return '';
    };

    const urlRow = result.url
        ? `<div class="sjc-row"><span class="sjc-label">URL</span><span class="sjc-value"><a href="${esc(result.url)}" target="_blank" rel="noopener noreferrer" class="sjc-url-link">${esc(result.url.length > 55 ? result.url.slice(0, 55) + '…' : result.url)}</a></span></div>`
        : '';

    const tagRow = result.tags.length
        ? `<div class="sjc-row"><span class="sjc-label">Tags</span><span class="sjc-value">${result.tags.map(t => `<span class="job-tag">${esc(t)}</span>`).join(' ')}</span></div>`
        : '';

    const stars = '★'.repeat(result.score) + '☆'.repeat(5 - result.score);

    const fit = result.locationFit;
    const fitRow = fit ? `
        <div class="sjc-row">
            <span class="sjc-label">Location Fit</span>
            <span class="sjc-value sjc-location-fit sjc-fit-${fit.level}">
                <span class="sjc-fit-label">${esc(fit.label)}</span>
                <span class="sjc-fit-msg">${esc(fit.message)}</span>
            </span>
        </div>` : '';

    const uncHTML = result.uncertainties.length
        ? `<div class="sjc-uncertainties">${result.uncertainties.map(u => `<div class="sjc-uncertainty">&#9432; ${esc(u)}</div>`).join('')}</div>`
        : '';

    container.innerHTML = `
        <div class="sjc-preview-inner">
            <div class="sjc-preview-header">Extracted Details</div>
            ${row('Title',    result.title,    true)}
            ${row('Company',  result.company,  true)}
            ${urlRow}
            ${row('Location', result.location)}
            ${fitRow}
            ${row('Salary',   result.salary)}
            ${tagRow}
            <div class="sjc-row">
                <span class="sjc-label">Score</span>
                <span class="sjc-value sjc-score sjc-score-${result.score}">${stars} ${result.score}/5</span>
            </div>
            <div class="sjc-note sjc-note-${result.score}">${esc(result.note)}</div>
            ${uncHTML}
            ${result.title ? '<div class="sjc-fill-hint">&#9432; Extracted details will be included when you save this job or open Full Details.</div>' : ''}
        </div>`;
    container.classList.remove('hidden');
}

function applySmartJobCaptureToQuickFields(result) {
    const titleEl   = document.getElementById('jq-title');
    const companyEl = document.getElementById('jq-company');
    const urlEl     = document.getElementById('jq-url');
    if (titleEl   && result.title)   titleEl.value   = result.title;
    if (companyEl && result.company) companyEl.value = result.company;
    if (urlEl     && result.url)     urlEl.value     = result.url;
    // Trigger duplicate warning automatically after filling fields
    checkJobDuplicateWarning(
        titleEl?.value.trim()   || '',
        companyEl?.value.trim() || '',
        urlEl?.value.trim()     || '',
        'jq-dup-warning', null
    );
}

// Returns true when a cached SJC result still matches the current title/company values.
// Used to prevent stale extraction from polluting an unrelated Quick Capture save.
function _sjcResultMatchesCapture(sjc, title, company) {
    if (!sjc) return false;
    if (!title && !company) return false;
    const et = normalizeText(sjc.title   || '');
    const ec = normalizeText(sjc.company || '');
    const qt = normalizeText(title       || '');
    const qc = normalizeText(company     || '');
    const titleMatch   = !et || !qt || et === qt || qt.includes(et) || et.includes(qt);
    const companyMatch = !ec || !qc || ec === qc || qc.includes(ec) || ec.includes(qc);
    return titleMatch && companyMatch;
}

function smartJobCaptureExtract() {
    const input = document.getElementById('sjc-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) { showToast('Paste a job advert first'); return; }
    const result = parseSmartJobCaptureText(text);
    lastSmartJobCaptureResult = result;       // cache for quickAddJob / openJobModal
    renderSmartJobCapturePreview(result);
    applySmartJobCaptureToQuickFields(result);
    showToast(result.title
        ? 'Details extracted — check the Quick Capture fields below'
        : 'Extracted what was possible — review results below'
    );
}

function smartJobCaptureClear() {
    lastSmartJobCaptureResult = null;
    const input = document.getElementById('sjc-input');
    if (input) input.value = '';
    const preview = document.getElementById('sjc-preview');
    if (preview) { preview.innerHTML = ''; preview.classList.add('hidden'); }
}

function bindSmartJobCaptureEvents() {
    const input = document.getElementById('sjc-input');
    if (!input) return;
    // Ctrl+Enter or Cmd+Enter triggers extraction without clicking the button
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            smartJobCaptureExtract();
        }
    });
}

// ===== ALREADY APPLIED CHECKER =====

// Generic role/level words that carry no signal when matching titles in isolation.
const GENERIC_JOB_WORDS = new Set([
    'junior', 'senior', 'graduate', 'trainee', 'engineer', 'support', 'analyst',
    'consultant', 'manager', 'assistant', 'officer', 'specialist', 'administrator',
    'infrastructure', 'cloud', 'cyber', 'cybersecurity', 'security', 'technology',
    'operations',
]);

function normalizeText(value) {
    if (!value) return '';
    return value.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function normalizeUrl(value) {
    if (!value) return '';
    return value.trim().toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/\/$/, '');
}

function getAllJobRecords() {
    return state.jobs || [];
}

function getMeaningfulWords(text) {
    return normalizeText(text)
        .split(/\s+/)
        .filter(w => w.length > 2 && !GENERIC_JOB_WORDS.has(w));
}

// ---- Central duplicate-detection function ----
// Returns { level: 'exact'|'high'|'possible'|'none', job, reason, score }
function getBestJobDuplicateMatch({ title = '', company = '', url = '', location = '', salary = '', query = '', excludeId = null } = {}) {
    const candidates = (state.jobs || []).filter(j => j.id !== excludeId);
    let best = { level: 'none', job: null, reason: '', score: 0 };
    for (const job of candidates) {
        const r = _scoreJobForDuplicate({ title, company, url, location, salary, query }, job);
        if (r.score > best.score) { best = { ...r, job }; }
        if (best.level === 'exact') break;
    }
    return best;
}

// Checks only against already-applied jobs; used for render-time card warnings.
// Returns { level, job, reason, score } where job (if any) has status Applied or applied===true.
function getAppliedDuplicateMatch(job) {
    const candidates = (state.jobs || []).filter(j =>
        j.id !== job.id && (j.status === 'Applied' || j.applied)
    );
    let best = { level: 'none', job: null, reason: '', score: 0 };
    for (const candidate of candidates) {
        const r = _scoreJobForDuplicate(
            { title: job.title || '', company: job.company || '', url: job.url || '',
              location: job.location || '', salary: job.salary || '', query: '' },
            candidate
        );
        if (r.score > best.score) { best = { ...r, job: candidate }; }
        if (best.level === 'exact') break;
    }
    return best;
}

function _scoreJobForDuplicate({ title, company, url, location, salary, query }, job) {
    const effectiveTitle   = title   || query;
    const effectiveCompany = company || '';
    const effectiveUrl     = url || (query.includes('://') || query.startsWith('www.') ? query : '');

    // 1. URL exact match
    const qUrl = normalizeUrl(effectiveUrl);
    const jUrl = normalizeUrl(job.url || '');
    if (qUrl.length > 5 && qUrl === jUrl) {
        return { score: 100, level: 'exact', reason: 'Exact URL match' };
    }

    // 2. Company matching (compare company fields directly)
    const jobCompText  = normalizeText(job.company || '');
    const qCompText    = normalizeText(effectiveCompany);
    const compWords    = jobCompText.split(/\s+/).filter(w => w.length > 2);
    const qCompWords   = qCompText.split(/\s+/).filter(w => w.length > 2);
    const compHits     = compWords.filter(w => qCompWords.includes(w)).length;
    const compRatio    = compWords.length > 0 ? compHits / compWords.length : 0;
    const companyMatch = compRatio >= 0.5 && compHits > 0;

    // 3. Meaningful title matching
    const jobMean = getMeaningfulWords(job.title || '');
    const qMean   = getMeaningfulWords(effectiveTitle);
    const titHits  = jobMean.filter(w => qMean.includes(w)).length;
    const titRatio = jobMean.length > 0 ? titHits / jobMean.length : 0;
    const titleStrongMatch = titHits >= 1 && titRatio >= 0.5;

    // 4. All-word fallback for all-generic titles
    const allJobTit = normalizeText(job.title || '').split(/\s+/).filter(w => w.length > 2);
    const allQTit   = normalizeText(effectiveTitle).split(/\s+/).filter(w => w.length > 2);
    const allHits   = jobMean.length === 0 ? allJobTit.filter(w => allQTit.includes(w)).length : 0;
    const allRatio  = allJobTit.length > 0 ? allHits / allJobTit.length : 0;
    const fallbackTitle = jobMean.length === 0 && allRatio >= 0.5 && allHits >= 2;
    const effectiveTitleMatch = titleStrongMatch || fallbackTitle;

    if (companyMatch && effectiveTitleMatch) {
        return { score: 85, level: 'high', reason: 'Same company and similar title' };
    }
    if (companyMatch) {
        return { score: 35, level: 'possible', reason: 'Company match' };
    }
    if (effectiveTitleMatch) {
        let score  = titHits >= 2 ? 45 : 35;
        let reason = 'Similar title only';
        const jobLoc   = normalizeText(job.location || '');
        const qLoc     = normalizeText(location || query);
        const locWords = jobLoc.split(/\s+/).filter(w => w.length > 2);
        if (locWords.length && locWords.some(w => qLoc.includes(w))) {
            score += 15; reason = 'Similar title and location';
        }
        const jobSal = normalizeText(job.salary || '');
        const qSal   = normalizeText(salary || '');
        if (jobSal && qSal && jobSal.split(/\s+/).some(w => w.length > 1 && qSal.includes(w))) {
            score += 10;
        }
        return { score, level: score >= 55 ? 'high' : 'possible', reason };
    }

    return { score: 0, level: 'none', reason: '' };
}

// ---- Live job-list text filter ----
// Returns true if the job matches the free-text query across all fields.
function jobMatchesTextFilter(job, query) {
    if (!query || !query.trim()) return true;
    const allText = [
        job.title, job.company, job.location, job.salary,
        job.notes, job.status, job.url, ...(job.tags || []),
    ].map(v => normalizeText(v || '')).join(' ');
    const qWords = normalizeText(query).split(/\s+/).filter(w => w.length > 0);
    return qWords.every(w => allText.includes(w));
}

// ---- Broad free-text search for the checker ----
// Returns [{ job, score, matchLevel, reason }] sorted by score desc.
function searchJobsFreeText(query) {
    if (!query || !query.trim()) return [];
    const q      = normalizeText(query);
    const qWords = q.split(/\s+/).filter(w => w.length > 1);
    const qUrl   = normalizeUrl(query);
    const qMean  = getMeaningfulWords(query);
    const results = [];

    for (const job of (state.jobs || [])) {
        let score = 0, matchLevel = 'none', reason = '';

        // URL exact
        const jUrl = normalizeUrl(job.url || '');
        if (qUrl.length > 5 && jUrl === qUrl) {
            results.push({ job, score: 100, matchLevel: 'exact', reason: 'Exact URL match' });
            continue;
        }
        // URL partial
        if (qUrl.length > 8 && jUrl && jUrl.includes(qUrl)) {
            score = 75; matchLevel = 'high'; reason = 'URL partial match';
        }

        if (matchLevel === 'none') {
            const compText  = normalizeText(job.company || '');
            const compWords = compText.split(/\s+/).filter(w => w.length > 2);
            const compHits  = compWords.filter(w => qWords.includes(w)).length;
            const compMatch = compWords.length > 0 && (compHits / compWords.length) >= 0.5 && compHits > 0;

            const jobMean   = getMeaningfulWords(job.title || '');
            const titHits   = jobMean.filter(w => qMean.includes(w)).length;
            const titRatio  = jobMean.length > 0 ? titHits / jobMean.length : 0;
            const titleStrong = jobMean.length > 0 && titHits >= 1 && titRatio >= 0.5;

            // Fallback for all-generic titles
            const allJobTit  = normalizeText(job.title || '').split(/\s+/).filter(w => w.length > 2);
            const allTitHits = jobMean.length === 0 ? allJobTit.filter(w => qWords.includes(w)).length : 0;
            const fallback   = jobMean.length === 0 &&
                allJobTit.length > 0 && (allTitHits / allJobTit.length) >= 0.5 && allTitHits >= 2;

            if (compMatch && (titleStrong || fallback)) {
                score = 85; matchLevel = 'high'; reason = 'Same company and similar title';
            } else if (titleStrong || fallback) {
                score = 50; matchLevel = 'possible'; reason = 'Similar title only';
            } else if (compMatch) {
                score = 30; matchLevel = 'possible'; reason = 'Company match';
            } else {
                // Broad field search — any meaningful word found anywhere
                const allText = [
                    job.title, job.company, job.location, job.salary,
                    job.notes, job.status, job.url, ...(job.tags || []),
                ].map(v => normalizeText(v || '')).join(' ');
                const allWords   = allText.split(/\s+/).filter(w => w.length > 1);
                const longQWords = qWords.filter(w => w.length > 2);
                const hits = longQWords.filter(w => allWords.includes(w)).length;
                const ratio = longQWords.length > 0 ? hits / longQWords.length : 0;
                if (ratio >= 0.5 && hits >= 1) {
                    score = Math.max(15, Math.floor(ratio * 28));
                    matchLevel = 'possible'; reason = 'Partial match';
                }
            }
        }

        if (matchLevel !== 'none') results.push({ job, score, matchLevel, reason });
    }

    return results.sort((a, b) => b.score - a.score);
}

function searchAppliedJobs(query) {
    return searchJobsFreeText(query);
}

function renderAppliedSearchResults(results) {
    const container = document.getElementById('jac-results');
    if (!container) return;

    if (!results || results.length === 0) {
        const noJobsYet = (state.jobs || []).length === 0;
        container.innerHTML = `
            <div class="jac-result-card jac-result-none">
                <div class="jac-result-label">${noJobsYet ? 'No jobs saved yet' : 'No application found'}</div>
                <p class="jac-result-msg">${noJobsYet
                    ? 'Add your first job using Quick Capture above.'
                    : 'No matching job application was found in your records. You may not have applied for this one yet.'}</p>
            </div>`;
        return;
    }

    container.innerHTML = results.slice(0, 6).map(r => {
        const j          = r.job;
        const level      = r.matchLevel || 'possible';
        const isStrong   = level === 'exact' || level === 'high';
        const cardClass  = isStrong ? 'jac-result-strong' : 'jac-result-possible';
        const levelLabel = level === 'exact' ? 'Exact Match' : level === 'high' ? 'High Probability' : 'Possible Match';
        const createdDate = j.createdAt
            ? new Date(j.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            : '';
        const notesPreview = j.notes ? (j.notes.length > 80 ? j.notes.slice(0, 80) + '…' : j.notes) : '';

        return `
            <div class="jac-result-card ${cardClass}">
                <div class="jac-result-header">
                    <span class="jac-result-label">${levelLabel}</span>
                    <span class="job-status-badge jstatus-${j.status.toLowerCase()}">${esc(j.status)}</span>
                    ${r.reason ? `<span class="jac-result-reason">${esc(r.reason)}</span>` : ''}
                </div>
                <div class="jac-result-title">${esc(j.title)}</div>
                ${j.company  ? `<div class="jac-result-company">${esc(j.company)}</div>` : ''}
                <div class="jac-result-details">
                    ${j.location  ? `<span>&#128205; ${esc(j.location)}</span>`  : ''}
                    ${j.salary    ? `<span>&#128176; ${esc(j.salary)}</span>`    : ''}
                    ${createdDate ? `<span>&#128197; ${createdDate}</span>`      : ''}
                    ${j.url ? `<a href="${esc(j.url)}" target="_blank" rel="noopener noreferrer" class="jac-result-link">View &#8599;</a>` : ''}
                </div>
                ${notesPreview ? `<div class="jac-result-notes">${esc(notesPreview)}</div>` : ''}
                <button class="btn btn-outline btn-sm" onclick="openJobModal('${esc(j.id)}')">Open Job Entry</button>
            </div>`;
    }).join('');
}

// Builds rich HTML content for a duplicate-warning box.
function buildDupWarningHTML(match) {
    const j = match.job;
    const msg = match.level === 'exact'
        ? 'Exact URL match. This job is already in your records.'
        : match.level === 'high'
        ? 'High probability: you already saved or applied for this job.'
        : 'Possible similar job found. Check before applying again.';
    const levelLabel = match.level === 'exact' ? 'Exact Match'
        : match.level === 'high' ? 'High Probability' : 'Possible Match';
    const createdDate = j.createdAt
        ? new Date(j.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : '';
    return `
        <div class="dup-warn-header"><strong>${msg}</strong></div>
        <div class="dup-warn-body">
            <span class="dup-warn-level-badge">${levelLabel}</span>
            <span class="dup-warn-reason">${esc(match.reason)}</span>
        </div>
        <div class="dup-warn-title">${esc(j.title)}</div>
        ${j.company ? `<div class="dup-warn-company">${esc(j.company)}</div>` : ''}
        <div class="dup-warn-details">
            <span class="job-status-badge jstatus-${j.status.toLowerCase()}">${esc(j.status)}</span>
            ${j.location   ? `<span class="dup-warn-detail">&#128205; ${esc(j.location)}</span>`  : ''}
            ${j.salary     ? `<span class="dup-warn-detail">&#128176; ${esc(j.salary)}</span>`    : ''}
            ${createdDate  ? `<span class="dup-warn-detail">&#128197; ${createdDate}</span>`      : ''}
        </div>
        <div class="dup-warn-actions">
            ${j.url ? `<a href="${esc(j.url)}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost btn-sm">&#8599; View listing</a>` : ''}
            <button class="btn btn-outline btn-sm" onclick="openJobModal('${esc(j.id)}')">Open entry</button>
        </div>`;
}

function checkJobDuplicateWarning(titleVal, companyVal, urlVal, warningId, excludeId) {
    const warning = document.getElementById(warningId);
    if (!warning) return;
    if (!titleVal && !companyVal && !urlVal) { warning.classList.add('hidden'); return; }

    const match = getBestJobDuplicateMatch({ title: titleVal, company: companyVal, url: urlVal, excludeId });
    if (match.level === 'none') { warning.classList.add('hidden'); return; }

    const isStrong = match.level === 'exact' || match.level === 'high';
    warning.className = 'dup-warning' + (isStrong ? ' dup-warning-danger' : '');
    warning.innerHTML = buildDupWarningHTML(match);
}

// ---- Job statistics ----
function renderJobStats() {
    const el = document.getElementById('job-stats');
    if (!el) return;
    const jobs      = state.jobs || [];
    const total     = jobs.length;
    const appliedIds = new Set(jobs.filter(j => j.status === 'Applied' || j.applied).map(j => j.id));
    const applied   = appliedIds.size;
    const saved     = jobs.filter(j => j.status === 'Saved').length;
    const interview = jobs.filter(j => j.status === 'Interview').length;
    const rejected  = jobs.filter(j => j.status === 'Rejected').length;
    const offers    = jobs.filter(j => j.status === 'Offer').length;

    el.innerHTML = [
        { label: 'Total',     val: total,     cls: '' },
        { label: 'Applied',   val: applied,   cls: 'stat-applied' },
        { label: 'Saved',     val: saved,     cls: 'stat-saved' },
        { label: 'Interview', val: interview, cls: 'stat-interview' },
        { label: 'Rejected',  val: rejected,  cls: 'stat-rejected' },
        { label: 'Offer',     val: offers,    cls: 'stat-offer' },
    ].map(s => `
        <div class="job-stat-item ${s.cls}">
            <span class="job-stat-val">${s.val}</span>
            <span class="job-stat-label">${s.label}</span>
        </div>`).join('');
}

// ---- Sort order ----
function setJobSort(value) {
    jobSortOrder = value;
    renderJobs();
}

function bindAppliedCheckerEvents() {
    const jacInput = document.getElementById('jac-input');
    if (jacInput) {
        let debounce;
        const runSearch = () => {
            const q = jacInput.value.trim();
            const container = document.getElementById('jac-results');
            if (!q) {
                if (container) container.innerHTML = '';
                jobSearchFilter = '';
                renderJobs();
                return;
            }
            jobSearchFilter = q;
            renderJobs();
            renderAppliedSearchResults(searchJobsFreeText(q));
        };
        jacInput.addEventListener('input',   () => { clearTimeout(debounce); debounce = setTimeout(runSearch, 250); });
        jacInput.addEventListener('keydown', e  => { if (e.key === 'Enter') { clearTimeout(debounce); runSearch(); } });
    }

    // Quick Capture duplicate warning
    ['jq-title', 'jq-company', 'jq-url'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', () => {
            checkJobDuplicateWarning(
                document.getElementById('jq-title')?.value.trim()   || '',
                document.getElementById('jq-company')?.value.trim() || '',
                document.getElementById('jq-url')?.value.trim()     || '',
                'jq-dup-warning', null
            );
        });
    });

    // Modal duplicate warning
    ['jm-title', 'jm-company', 'jm-url'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', () => {
            const rawId     = document.getElementById('jm-id')?.value;
            const excludeId = rawId && rawId.trim() ? rawId : null;
            checkJobDuplicateWarning(
                document.getElementById('jm-title')?.value.trim()   || '',
                document.getElementById('jm-company')?.value.trim() || '',
                document.getElementById('jm-url')?.value.trim()     || '',
                'jm-dup-warning', excludeId
            );
        });
    });
}

// ===== BACKUP STATUS & AUTO-BACKUP =====

function renderBackupStatus() {
    const el = document.getElementById('backup-status');
    if (!el) return;
    const last = localStorage.getItem('last_backup_date');
    const today = todayKey();
    if (!last) {
        el.textContent = 'Last backup: never';
        el.className = 'backup-status backup-never';
    } else if (last === today) {
        el.textContent = 'Last backup: today';
        el.className = 'backup-status backup-today';
    } else {
        el.textContent = `Last backup: ${last}`;
        el.className = 'backup-status backup-old';
    }
}

function scheduleAutoBackup() {
    const last = localStorage.getItem('last_backup_date');
    if (last === todayKey()) return;
    setTimeout(() => {
        if (localStorage.getItem('last_backup_date') !== todayKey()) {
            exportData();
        }
    }, 30000);
}

// ===== INIT =====

function init() {
    hydrate();

    if (window.location.protocol === 'file:') {
        document.getElementById('localhost-notice').classList.remove('hidden');
    }

    // Apply saved brain state immediately
    document.body.dataset.mode = state.brainState;
    renderBrainStateBar();

    // Tab clicks
    document.querySelectorAll('.tab').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Close modals on backdrop click
    ['emergency-modal', 'breakdown-modal', 'organise-modal', 'job-modal'].forEach(id => {
        document.getElementById(id).addEventListener('click', e => {
            if (e.target !== e.currentTarget) return;
            if (id === 'emergency-modal') closeEmergency(false);
            else if (id === 'breakdown-modal') closeBreakdown();
            else if (id === 'organise-modal') closeOrganise();
            else if (id === 'job-modal') closeJobModal();
        });
    });

    document.getElementById('start-timer-btn').addEventListener('click', startBreathingTimer);

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') { closeBreakdown(); closeEmergency(false); closeOrganise(); closeJobModal(); }
        if (e.key === 'Enter' && e.ctrlKey && document.activeElement.id === 'dump-input') processDump();
    });

    // Restore deep focus overlay if it was active
    if (state.brainState === 'deep-focus') updateDeepFocusOverlay();

    // Clean up print-howto class after printing
    window.addEventListener('afterprint', () => {
        document.body.classList.remove('print-howto');
    });

    bindAppliedCheckerEvents();
    bindSmartJobCaptureEvents();
    renderBackupStatus();
    scheduleAutoBackup();
    renderRecoveryDashboard();
}

document.addEventListener('DOMContentLoaded', init);
