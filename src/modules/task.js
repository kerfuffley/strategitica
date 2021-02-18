import * as Utils from './utils.js';
import { RRule, RRuleSet, rrulestr } from 'rrule';

export class Task {
    /**
     * @param {Object} taskObject - The task object from Habitica's API
     * @param {User} user - The user the task belongs to
     */
    constructor(taskObject, user) {
        this.id = taskObject.id;
        this.user = user;
        this.text = taskObject.text;
        this.type = taskObject.type;
        this.tags = taskObject.tags ? taskObject.tags : [];
        this.notes = taskObject.notes;
        this.date = taskObject.date ? taskObject.date : null;
        this.priority = taskObject.priority ? taskObject.priority : null;
        this.reminders = taskObject.reminders ? taskObject.reminders : [];
        this.frequency = taskObject.frequency ? taskObject.frequency : null;
        this.repeat = taskObject.repeat ? taskObject.repeat : null,
        this.everyX = taskObject.everyX ? taskObject.everyX : null,
        this.daysOfMonth = taskObject.daysOfMonth ? taskObject.daysOfMonth : null;
        this.weeksOfMonth = taskObject.weeksOfMonth ? taskObject.weeksOfMonth : null;
        this.startDate = taskObject.startDate ? taskObject.startDate : null;
        this.completed = taskObject.completed ? taskObject.completed : null;
        this.isDue = taskObject.isDue ? taskObject.isDue : null;
        this.nextDue = taskObject.nextDue ? taskObject.nextDue : null;
        this.checklist = taskObject.checklist ? taskObject.checklist : [];
        this.value = taskObject.value ? taskObject.value : 0;
        this.timeOfDay = 'whenever';
    }

    create() {
        var timeOfDayTagCount = 0;
        if (this.hasTimeOfDayTag('morning')) {
            timeOfDayTagCount++;
            this.timeOfDay = 'morning';
        }
        if (this.hasTimeOfDayTag('afternoon')) {
            timeOfDayTagCount++;
            this.timeOfDay = 'afternoon';
        }
        if (this.hasTimeOfDayTag('evening')) {
            timeOfDayTagCount++;
            this.timeOfDay = 'evening';
        }

        if (timeOfDayTagCount > 1) {
            this.timeOfDay = 'whenever';
        }
    }

    /**
     * Check if the task has a given tag (by tag ID).
     * @param {*} tagId - The tag ID to look for
     * @returns {boolean} true if the tag is found
     */
    hasTag(tagId) {
        var tags = this.tags;
        var hasTag = Object.keys(tags).some(function (i) {
            return tags[i] === tagId;
        });
    
        return hasTag;
    }

    isOneTimeDaily() {
        var task = this;
        var userTagNames = this.user.tags;

        if (Object.keys(userTagNames).length > 0) {
            var oneTimeDailyTagId = '';
    
            Object.keys(userTagNames).forEach(function (key) {
                if (userTagNames[key].endsWith('[strategitica|1td]')) {
                    if (oneTimeDailyTagId === '') {
                        oneTimeDailyTagId = key;
                    }
                    else {
                        return false;
                    }
                }
            });
    
            if (oneTimeDailyTagId !== '') {
                return task.hasTag(oneTimeDailyTagId);
            }
        }
        else {
            return false;
        }
    }

    hasTimeOfDayTag(timeOfDay) {
        var task = this;
        var userTagNames = this.user.tags;

        if (Object.keys(userTagNames).length > 0) {
            var timeOfDayTagId = '';
    
            Object.keys(userTagNames).forEach(function (key) {
                if (userTagNames[key].endsWith('[strategitica|' + timeOfDay + ']')) {
                    if (timeOfDayTagId === '') {
                        timeOfDayTagId = key;
                    }
                    else {
                        return false;
                    }
                }
            });
    
            if (timeOfDayTagId !== '') {
                return task.hasTag(timeOfDayTagId);
            }
        }
        else {
            return false;
        }
    }

    /**
     * Check if a given task has a certain task indicating its duration, and
     * returns that duration as a number of minutes. Tags intended for use as
     * task durations must end in the format "##:##" or "#:##" for this to
     * work. If a task doesn't have a duration tag, or if it has more than one
     * duration tag, or if a number can't be determined from the tag, 0 is
     * returned. 
     * @returns {number} The task duration in minutes
     */
    duration() {
        var task = this;
        var userTagNames = this.user.tags;
        var duration = 0;

        if (Object.keys(userTagNames).length > 0) {
            var durationTagId = '';

            var regex = /\[strategitica\|duration\|(\d{2}):(\d{2})\]$/mi;

            task.tags.forEach(function (value) {
                if (userTagNames[value].match(regex) !== null) {
                    if (durationTagId === '') {
                        durationTagId = value;
                    }
                    else {
                        durationTagId = '';
                    }
                }
            });

            if (durationTagId !== '') {
                var regexResult = userTagNames[durationTagId].match(regex);
                var durationHours = Number(regexResult[1]);
                var durationMinutes = Number(regexResult[2]);
                duration = (durationHours * 60) + durationMinutes;
            }

            if (duration.isNaN) {
                duration = 0;
            }
        }
        
        return duration;
    }

    /**
     * Gathers info about a given task's frequency, including:
     * 1.   Whether it repeats daily, weekly, etc.
     * 2.   Which days of the week it repeats on, if applicable
     * 3.   Which days of the month it repeats on, if applicable (e.g. the 5th,
     *      the 12th, etc.)
     * 4.   Which weeks of the month it repeats on, if applicable. Note that
     *      Habitica seems to think that days 1-7 of the month are always the
     *      first week, and days 8-14 are always the second week, and so on.
     *      It's the wrong way of determining the week number but I don't set
     *      tasks to repeat based on the week of the month, so I personally
     *      don't care.
     * It takes all this into account and outputs the frequency in a summed-up
     * way, e.g. "Every other month", "Every Tuesday", "Every month on the
     * 15th", etc. It uses {@link Utils.getNumberOrdinal} to do some of this.
     * @returns {string} The task frequency, summed up
     */
    frequencyFormatted() {
        var task = this;
        var frequencyHtml = '';

        var weekdayNames = {
            'su': 'Sunday',
            'm': 'Monday',
            't': 'Tuesday',
            'w': 'Wednesday',
            'th': 'Thursday',
            'f': 'Friday',
            's': 'Saturday'
        };

        if (task.frequency != null) {
            var frequencyName = '';

            if (task.frequency === 'daily') {
                frequencyName = 'day';
            }
            if (task.frequency === 'weekly') {
                frequencyName = 'week';

                if (task.repeat != null) {
                    var repeatingDays = [];

                    for (const property in task.repeat) {
                        if (task.repeat[property] === true) {
                            repeatingDays.push(weekdayNames[property]);
                        }
                    }

                    var repeatingDaysString = repeatingDays.join('-');
                    if (repeatingDays.length > 2) {
                        var lastSeparatorIndex = repeatingDaysString.lastIndexOf('-');
                        repeatingDaysString = repeatingDaysString.slice(0, lastSeparatorIndex) + repeatingDaysString.slice(lastSeparatorIndex).replace('-', ' and ');
                        repeatingDaysString = repeatingDaysString.replace(/-/g, ', ');
                    }
                    else {
                        repeatingDaysString = repeatingDaysString.replace(/-/g, ' and ');
                    }

                    if (repeatingDays.length <= 1) {
                        frequencyName = repeatingDaysString;
                    }
                    else {
                        frequencyName += ' on ' + repeatingDaysString;
                    }
                }
            }
            if (task.frequency === 'monthly') {
                frequencyName = 'month';
            }
            if (task.frequency === 'yearly') {
                frequencyName = 'year';
            }

            if (task.frequency === 'yearly') {
                if (task.everyX != null) {
                    if (task.everyX >= 2) {
                        frequencyName = task.everyX + ' ' + frequencyName + 's';
                    }
                }

                var taskStartDate = new Date(task.startDate);
                var taskStartMonth = Utils.monthNames[taskStartDate.getMonth()][0];
                var taskStartDay = taskStartDate.getDate();
        
                frequencyHtml += 'Every ' + frequencyName + ' on ' + taskStartMonth + ' ' + taskStartDay + Utils.getNumberOrdinal(taskStartDay);
            }
            else {
                if (task.everyX != null) {
                    if (task.everyX > 2) {
                        var plural = 's';
                        var everyXString = task.everyX.toString();
                        var numberOrdinal = '';
        
                        if (task.frequency === 'weekly' && frequencyName !== 'week') {
                            plural = '';
                            numberOrdinal = Utils.getNumberOrdinal(task.everyX);
                        }
        
                        frequencyName = task.everyX + numberOrdinal + ' ' + frequencyName + plural;
                    }
                    else if (task.everyX === 2) {
                        frequencyName = 'other ' + frequencyName;
                    }
                }
        
                frequencyHtml += 'Every ' + frequencyName;

                if (task.daysOfMonth != null && task.daysOfMonth.length > 0) {
                    frequencyHtml += ' on ';
                    var daysOfMonthWithOrdinal = [];
        
                    task.daysOfMonth.forEach(function (value) {
                        daysOfMonthWithOrdinal.push('the ' + value + Utils.getNumberOrdinal(value));
                    });
        
                    var daysOfMonthString = daysOfMonthWithOrdinal.join('-');
        
                    if (daysOfMonthWithOrdinal.length > 2) {
                        var lastSeparatorIndex = daysOfMonthString.lastIndexOf('-');
                        daysOfMonthString = daysOfMonthString.slice(0, lastSeparatorIndex) + daysOfMonthString.slice(lastSeparatorIndex).replace('-', ' and ');
                        daysOfMonthString = daysOfMonthString.replace(/-/g, ', ');
                    }
                    else {
                        daysOfMonthString = daysOfMonthString.replace(/-/g, ' and ');
                    }
        
                    frequencyHtml += daysOfMonthString;
                }
        
                if (task.weeksOfMonth != null && task.weeksOfMonth.length > 0) {
                    frequencyHtml += ' on ';
                    var weeksOfMonthWithOrdinal = [];
        
                    task.weeksOfMonth.forEach(function (value) {
                        var week = value + 1;
                        weeksOfMonthWithOrdinal.push('the ' + week + Utils.getNumberOrdinal(week));
                    });
        
                    var weeksOfMonthString = weeksOfMonthWithOrdinal.join('-');
        
                    if (weeksOfMonthWithOrdinal.length > 2) {
                        var lastSeparatorIndex = weeksOfMonthString.lastIndexOf('-');
                        weeksOfMonthString = weeksOfMonthString.slice(0, lastSeparatorIndex) + weeksOfMonthString.slice(lastSeparatorIndex).replace('-', ' and ');
                        weeksOfMonthString = weeksOfMonthString.replace(/-/g, ', ');
                    }
                    else {
                        weeksOfMonthString = weeksOfMonthString.replace(/-/g, ' and ');
                    }
        
                    frequencyHtml += weeksOfMonthString + ' week' + (weeksOfMonthWithOrdinal.length > 1 ? 's' : '');
        
                    if (task.repeat != null) {
                        var repeatingDays = [];
        
                        for (const property in task.repeat) {
                            if (task.repeat[property] === true) {
                                repeatingDays.push(weekdayNames[property]);
                            }
                        }
        
                        var repeatingDaysString = repeatingDays.join('-');
                        if (repeatingDays.length > 2) {
                            var lastSeparatorIndex = repeatingDaysString.lastIndexOf('-');
                            repeatingDaysString = repeatingDaysString.slice(0, lastSeparatorIndex) + repeatingDaysString.slice(lastSeparatorIndex).replace('-', ' and ');
                            repeatingDaysString = repeatingDaysString.replace(/-/g, ', ');
                        }
                        else {
                            repeatingDaysString = repeatingDaysString.replace(/-/g, ' and ');
                        }
        
                        frequencyHtml += ' on ' + repeatingDaysString;
                    }
                }
            }
        }

        return frequencyHtml;
    }

    /**
     * Dailies have a startDate, and todo's have a date (i.e. due date), but
     * often these dates don't work for a calendar because they're in the past,
     * or that task was due today but is now completed, etc. This function gets
     * the first date that a task should appear on the calendar.
     * 
     * 1.   If it's a daily, we'll see if we can use startDate first.
     * 2.   If startDate is in the past...
     *      a.  If the task is marked as "due", since startDate is in the past,
     *          that means it's past due, so we'll set firstDate to today.
     *      b.  If it's not marked as "due", then this date in the past is no
     *          good. We'll set firstDate to null and hopefully we can find a
     *          better date with nextDue.
     * 3.   If firstDate isn't null at this point, and if firstDate is today
     *      and this task is marked completed (which means it's completed for
     *      today, but not for future dates), then this task shouldn't show up
     *      for this date either. Hopefully we can find a better date with
     *      nextDue.
     * 4.   Now we're done looking at startDate. If firstDate ended up being
     *      null, and nextDue isn't empty...
     *      a.  Loop through nextDue to find the earliest date.
     *      b.  Set firstDate to the earliest date found.
     * 5.   If it's a todo, we'll see if we can use date.
     * 6.   If date is in the past, we'll just set firstDate to today.
     *      Apparently todo's don't get marked with isDue like dailies do, so
     *      there's not really any discerning from due/not due todo's.
     * 7.   Same as [3], except we won't have dates to look at with nextDue
     *      since that doesn't apply to todo's. I'm not sure if this scenario
     *      would ever happen since I would think a todo that's complete just
     *      doesn't exist anymore. We'll keep this logic here just in case.
     * @returns {Date|null} The first date this task should show up on the calendar, or null if no applicable date is found
     */
    firstCalendarDate() {
        var firstDate = null;
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        var isDue = this.isDue;
        var completed = this.completed;

        var message = '';

        if (this.type === 'daily') { // [1]
            message += 'firstCalendarDate() for ' + this.text;
            if (this.startDate !== null) { // [1]
                firstDate = new Date(this.startDate);
                firstDate.setHours(0, 0, 0, 0);
                message += '\n\tstartDate found: ' + firstDate;

                if (firstDate < today) { // [2]
                    message += '\n\tdate in past';
                    if (isDue !== null && isDue === true) { // [2a]
                        message += ', and it is due, so set to today';
                        firstDate = today; // [2a]
                    }
                    else { // [2b]
                        message += ', and not due, so set to null';
                        firstDate = null; // [2b]
                    }
                }

                if (firstDate !== null) { // [3]
                    message += '\n\tnot null at this point';
                    if (Utils.getDateKey(firstDate) === Utils.getDateKey(today) && completed !== null && completed === true) { // [3]
                        message += '\n\tdue today and completed, so set to null';
                        firstDate = null; // [3]
                    }
                }
            }

            if (firstDate === null && this.nextDue !== null && this.nextDue.length > 0) { // [4]
                var nextDue = this.nextDue;
                var earliestNextDue = null; // [4a]

                for (var i = 0; i < nextDue.length; i++) { // [4a]
                    var thisDate = new Date(nextDue[i]);

                    if (earliestNextDue === null || (earliestNextDue !== null && thisDate < earliestNextDue)) { // [4a]
                        earliestNextDue = thisDate; // [4a]
                    }
                }

                firstDate = earliestNextDue; // [4b]
                firstDate.setHours(0, 0, 0, 0);

                message += '\n\tdate found from nextDue: ' + firstDate;
            }
        }
        else if (this.type === 'todo') { // [5]
            if (this.date !== null) { // [5]
                firstDate = new Date(this.date);
                firstDate.setHours(0, 0, 0, 0);

                if (firstDate < today) { // [6]
                    firstDate = today;  // [6]
                }

                if (firstDate !== null) { // [7]
                    if (Utils.getDateKey(firstDate) === Utils.getDateKey(today) && completed !== null && completed === true) { // [7]
                        firstDate = null; // [7]
                    }
                }
            }
        }

        return firstDate;
    }

    /**
     * Gets a list of dates to show a task for in the calendar.
     * 
     * 1.   Get the earliest date to look at with {@link firstCalendarDate}
     * 2.   Get the latest date to look at with today and daysLimit
     * 3.   If [1] was found and it's before [2]...
     * 4.   Add [1] to the list of dates, but in the nice format of
     *      {@link Utils.getDateKey}, since that's the format the calendar will
     *      be using
     * 5.   If this task is a daily and it's not a one-time daily, then we can
     *      look at other dates for this task. Todo's aren't recurring tasks,
     *      so dailies are the only type of task this should apply to. And
     *      one-time dailies should only appear once on the calendar, even
     *      though Habitica sees more dates for them.
     * 6.   Now, we're basically setting up some other params that we'll pass
     *      to rrule.js soon. These include (but are not limited to):
     *      a.  The task frequency (either daily, weekly, monthly or yearly)
     *      b.  The day of the month the task should recur on. Only applicable
     *          for monthly tasks where this option is selected.
     *      c.  The week of the month the task should recur on. Only applicable
     *          for monthly tasks where this option is selected.
     *      d.  The days of the week that this task repeats on. This only
     *          applies to weekly tasks, or monthly tasks where [6c] applies.
     *      e.  The interval of each frequency iteration. For example:
     *          - 2 if a task is due every 2 weeks
     *          - 3 if a task is due every 3 days
     *          - 1 if a task is due every month
     *          - 5 if a task is due every 5 days
     * 7.   We can finally use the params we set up in [6] and pass them to
     *      rrule.
     * 8.   Now we have those future dates, let's add them to the list, making
     *      sure not to add any duplicate dates. And, just like with [4],
     *      they'll be formatted nicely.
     * @param {number} daysLimit - How far in the future to look as a number of days
     * @returns {Array.<string>} The task's calendar days
     */
    dates(daysLimit) {
        var dates = [];
        var startDate = this.firstCalendarDate(); // [1]

        var today = new Date();
        today.setHours(0, 0, 0, 0);

        var endDate = new Date();
        endDate.setDate(today.getDate() + daysLimit); // [2]
        endDate.setHours(0, 0, 0, 0);

        if (startDate !== null && startDate <= endDate) { // [3]
            dates.push(Utils.getDateKey(startDate)); // [4]
    
            if (this.type === 'daily' && !this.isOneTimeDaily()) { // [5]
                var frequency = this.frequency;
                var repeat = this.repeat;
                var daysOfMonth = this.daysOfMonth;
                var weeksOfMonth = this.weeksOfMonth;

                var freq = null; // [6a]
                var bymonthday = []; // [6b]
                var bysetpos = []; // [6c]
                var byweekday = []; // [6d]
                var interval = this.everyX; // [6e]

                if (frequency === 'daily') {
                    freq = RRule.DAILY; // [6a]
                }
                else if (frequency === 'weekly') {
                    freq = RRule.WEEKLY; // [6a]
                }
                else if (frequency === 'monthly') {
                    freq = RRule.MONTHLY; // [6a]

                    if (daysOfMonth && daysOfMonth.length > 0) {
                        for (var i = 0; i < daysOfMonth.length; i++) {
                            bymonthday.push(daysOfMonth[i] === 31 ? -1 : daysOfMonth[i]); // [6b]
                        }
                    }
                    if (weeksOfMonth && weeksOfMonth.length > 0) {
                        for (var i = 0; i < weeksOfMonth.length; i++) {
                            bysetpos.push(weeksOfMonth[i] + 1); // [6c]
                        }
                    }
                }
                else if (frequency === 'yearly') {
                    freq = RRule.YEARLY; // [6a]
                }

                if (frequency === 'weekly' || (frequency === 'monthly' && weeksOfMonth && weeksOfMonth.length > 0)) {
                    if (repeat.su === true) {
                        byweekday.push(RRule.SU); // [6d]
                    }
                    if (repeat.m === true) {
                        byweekday.push(RRule.MO); // [6d]
                    }
                    if (repeat.t === true) {
                        byweekday.push(RRule.TU); // [6d]
                    }
                    if (repeat.w === true) {
                        byweekday.push(RRule.WE); // [6d]
                    }
                    if (repeat.th === true) {
                        byweekday.push(RRule.TH); // [6d]
                    }
                    if (repeat.f === true) {
                        byweekday.push(RRule.FR); // [6d]
                    }
                    if (repeat.s === true) {
                        byweekday.push(RRule.SA); // [6d]
                    }
                }
    
                var rule = null;
    
                if (byweekday.length > 0) {
                    if (bysetpos.length > 0) {
                        rule = new RRule({ // [7]
                            freq: freq, // [6a]
                            dtstart: startDate,
                            until: endDate,
                            interval: interval, // [6e]
                            wkst: RRule.SU,
                            byweekday: byweekday, // [6d]
                            bysetpos: bysetpos // [6c]
                        }).all();
                    }
                    else {
                        rule = new RRule({ // [7]
                            freq: freq, // [6a]
                            dtstart: startDate,
                            until: endDate,
                            interval: interval, // [6e]
                            wkst: RRule.SU,
                            byweekday: byweekday // [6d]
                        }).all();
                    }
                }
                else if (bymonthday.length > 0) {
                    rule = new RRule({ // [7]
                        freq: freq, // [6a]
                        dtstart: startDate,
                        until: endDate,
                        interval: interval, // [6e]
                        wkst: RRule.SU,
                        bymonthday: bymonthday // [6b]
                    }).all();
                }
                else {
                    rule = new RRule({ // [7]
                        freq: freq, // [6a]
                        dtstart: startDate,
                        until: endDate,
                        interval: interval, // [6e]
                        wkst: RRule.SU
                    }).all();
                }
    
                if (rule !== null && rule.length > 0) {
                    for (var i = 0; i < rule.length; i++) {
                        var thisDate = Utils.getDateKey(rule[i]);
                        if (dates.indexOf(thisDate) === -1) { // [8]
                            dates.push(thisDate); // [8]
                        }
                    }
                }
            }
        }

        return dates;
    }

    /**
     * Gets the HTML for this task to put in the calendar as a Bootstrap badge.
     * @returns {string} The task's badge HTML
     */
    badgeHtml() {
        var task = this;
        var badgeDifficultyClass = 'difficulty1';
        var badgeDifficultyDescription = 'Trivial';
        if (typeof task.priority === 'number') {
            if (task.priority === 1) {
                badgeDifficultyClass = 'difficulty2';
                badgeDifficultyDescription = 'Easy';
            }
            else if (task.priority === 1.5) {
                badgeDifficultyClass = 'difficulty3';
                badgeDifficultyDescription = 'Medium';
            }
            else if (task.priority >= 2) {
                badgeDifficultyClass = 'difficulty4';
                badgeDifficultyDescription = 'Hard';
            }
        }

        var badgeValueClass = '';
        var badgeValueDescription = '';
        if (typeof task.value === 'number') {
            if (task.value >= 12) {
                badgeValueClass = 'value1';
                badgeValueDescription = 'Best';
            }
            else if (task.value >= 6) {
                badgeValueClass = 'value2';
                badgeValueDescription = 'Better';
            }
            else if (task.value >= 1) {
                badgeValueClass = 'value3';
                badgeValueDescription = 'Good';
            }
            else if (task.value >= 0) {
                badgeValueClass = 'value4';
                badgeValueDescription = 'Neutral';
            }
            else if (task.value >= -9) {
                badgeValueClass = 'value5';
                badgeValueDescription = 'Bad';
            }
            else if (task.value >= -16) {
                badgeValueClass = 'value6';
                badgeValueDescription = 'Worse';
            }
            else {
                badgeValueClass = 'value7';
                badgeValueDescription = 'Worst';
            }
        }

        var taskDuration = task.duration();
        var taskTitleNoQuotes = task.text.replace('"', '&quot;');

        return '<button type="button" class="badge badge-task badge-task-js badge-' + badgeDifficultyClass + ' badge-' + badgeValueClass + '" data-taskid="' + task.id + '" title="' + taskTitleNoQuotes + '" data-tasktitle="' + taskTitleNoQuotes + '"><span class="badge-title">' + task.text.replace('<', '&lt;').replace('>', '&gt;') + '</span><span class="sr-only">(Task value: ' + badgeValueDescription + '; Task difficulty: ' + badgeDifficultyDescription + ')</span>' + (taskDuration > 0 ? '<span class="badge-addon">' + Utils.formatDuration(taskDuration) + '</span>' : '') + '</button>';
    }

    /**
     * Gets the HTML that'll go into a modal for this task.
     * @returns {string} The modal inner HTML
     */
    modalHtml() {
        var task = this;
        var userTags = this.user.tags;
        var isNewTask = task.id === 'new';

        var headerHtml = '';
        var bodyHtmlStatic = '';
        var bodyHtmlEditable = '';
        var footerHtml = '';

        var taskTitleNoQuotes = task.text ? task.text.replace('"', '&quot;') : '';

        // Header
        headerHtml += '<div class="modal-header">';
        headerHtml += '<h5 class="modal-title task-param-static-js" id="modal-task-' + task.id + '-label">' + (isNewTask ? 'New Task' : task.text) + '</h5>';
        headerHtml += '<div class="form-group task-param-editable-js d-none"><label for="task-' + task.id + '-text" class="sr-only">Title</label><input type="text" class="form-control form-control-lg" id="task-' + task.id + '-text" value="' + taskTitleNoQuotes + '" placeholder="Task title"></div>';
        headerHtml += '<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>';
        headerHtml += '</div>'; // end .modal-header

        // Task ID
        bodyHtmlEditable += '<input type="hidden" id="task-' + task.id + '-type" value="' + task.type + '">';


        // Notes
        if (task.notes && task.notes.trim() != null && task.notes.trim() != '') {
            bodyHtmlStatic += '<p class="task-param-static-js">' + task.notes.trim() + '</p>';
        }
        bodyHtmlEditable += '<div class="form-group task-param-editable-js d-none"><label for="task-' + task.id + '-notes">Notes</label><textarea class="form-control form-control-sm" id="task-' + task.id + '-notes" rows="3" placeholder="Add notes">' + (task.notes ? task.notes.trim() : '') + '</textarea></div>';


        // Checklist
        if (task.checklist != null) {
            if (task.checklist.length > 0) {
                bodyHtmlStatic += '<ul class="list-unstyled task-param-static-js">';

                task.checklist.forEach(function (value) {
                    bodyHtmlStatic += '<li><div class="form-check">' +
                    '<input class="form-check-input task-checklist-item-js" type="checkbox" value="" id="checklist-' + value.id + '"' + (value.completed === true ? ' checked' : '') +' data-taskid="' + task.id + '" data-itemtitle="' + value.text.replace('"', '&quot;') + '" data-itemid="' + value.id + '">' + 
                    '<label class="form-check-label" for="checklist-' + value.id +'">' + value.text.replace('<', '&lt;').replace('>', '&gt;') +'</label>' +
                    '</div></li>';
                });

                bodyHtmlStatic += '</ul>';
            }
        }

        bodyHtmlStatic += '<table class="table table-sm table-borderless"><tbody>';

        // Difficulty
        var difficultyHtml = '';
        var difficultyStar = '&#9733;';
        if (typeof task.priority ==='number') {
            var difficultyContextClass = '';
            var difficultyStars = '';
            var difficultyName = '';

            if (task.priority < 1) {
                difficultyContextClass = 'difficulty1';
                difficultyStars = difficultyStar;
                difficultyName = 'Trivial';
            }
            else if (task.priority === 1) {
                difficultyContextClass = 'difficulty2';
                difficultyStars = difficultyStar + difficultyStar;
                difficultyName = 'Easy';
            }
            else if (task.priority === 1.5) {
                difficultyContextClass = 'difficulty3';
                difficultyStars = difficultyStar + difficultyStar + difficultyStar;
                difficultyName = 'Medium';
            }
            else if (task.priority >= 2) {
                difficultyContextClass = 'difficulty4';
                difficultyStars = difficultyStar + difficultyStar + difficultyStar + difficultyStar;
                difficultyName = 'Hard';
            }

            if (difficultyContextClass != '') {
                difficultyHtml = '<tr class="task-param-static-js"><th>Difficulty</th><td><span class="badge badge-' + difficultyContextClass + '">' + difficultyStars + '</span> ' + difficultyName + '</td></tr>';
            }
        }
        bodyHtmlStatic += difficultyHtml;
        bodyHtmlEditable += '<div class="form-group task-param-editable-js d-none"><label for="task-' + task.id + '-difficulty">Difficulty</label><select class="form-control form-control-sm" name="task-difficulty" id="task-' + task.id + '-difficulty">';
        bodyHtmlEditable += '<option value="0.1"' + (task.priority < 1 ? ' selected' : '') + '>' + difficultyStar + ' Trivial</option>';
        bodyHtmlEditable += '<option value="1"' + (task.priority === 1 ? ' selected' : '') + '>' + difficultyStar + difficultyStar + ' Easy</option>';
        bodyHtmlEditable += '<option value="1.5"' + (task.priority === 1.5 ? ' selected' : '') + '>' + difficultyStar + difficultyStar + difficultyStar + ' Medium</option>';
        bodyHtmlEditable += '<option value="2"' + (task.priority >= 2 ? ' selected' : '') + '>' + difficultyStar + difficultyStar + difficultyStar + difficultyStar + ' Hard</option>';
        bodyHtmlEditable += '</select></div>';

        // Start date (dailies only)
        if (task.type === 'daily') {
            bodyHtmlEditable += '<div class="form-group task-param-editable-js d-none"><label for="task-' + task.id + '-startdate">Start date</label><input type="date" class="form-control form-control-sm" id="task-' + task.id + '-startdate" value="' + (task.startDate ? Utils.getDateKey(new Date(task.startDate)) : Utils.getDateKey(new Date())) + '"></input></div>';
        }
        // Due date (todo's only)
        else if (task.type === 'todo') {
            bodyHtmlEditable += '<div class="form-group task-param-editable-js d-none"><label for="task-' + task.id + '-date">Due date</label><input type="date" class="form-control form-control-sm" id="task-' + task.id + '-date" value="' + (task.date ? Utils.getDateKey(new Date(task.date)) : Utils.getDateKey(new Date())) + '"></input></div>';
        }

        // Frequency (dailies only)
        if (task.frequencyFormatted() != '') {
            bodyHtmlStatic += '<tr class="task-param-static-js"><th>Frequency</th><td>' + task.frequencyFormatted() + '</td></tr>';
        }
        if (task.type === 'daily') {
            bodyHtmlEditable += '<div class="form-group task-param-editable-js d-none"><label for="task-' + task.id + '-frequency">Repeats</label><select class="form-control form-control-sm" name="task-frequency" id="task-' + task.id + '-frequency">';
            bodyHtmlEditable += '<option value="daily"' + (task.frequency === 'daily' ? ' selected' : '') + '>Daily</option>';
            bodyHtmlEditable += '<option value="weekly"' + (task.frequency === 'weekly' ? ' selected' : '') + '>Weekly</option>';
            bodyHtmlEditable += '<option value="monthly"' + (task.frequency === 'monthly' ? ' selected' : '') + '>Monthly</option>';
            bodyHtmlEditable += '<option value="yearly"' + (task.frequency === 'yearly' ? ' selected' : '') + '>Yearly</option>';
            bodyHtmlEditable += '</select></div>';
        }

        // EveryX (dailies only)
        if (task.type === 'daily') {
            bodyHtmlEditable += '<div class="form-group task-param-editable-js d-none">';
            bodyHtmlEditable += '<label for="task-' + task.id + '-everyx">Repeat every</label>';
            bodyHtmlEditable += '<div class="input-group input-group-sm">';
            bodyHtmlEditable += '<input type="number" class="form-control" name="task-everyx" id="task-' + task.id + '-everyx" value="' + task.everyX + '" min="0" max="9999" aria-describedby="task-' + task.id + '-everyx-addon">';
            bodyHtmlEditable += '<div class="input-group-append"><span class="input-group-text task-everyx-addon-js" id="task-' + task.id + '-everyx-addon">' + Utils.frequencyPlurals[task.frequency] + '</span></div>';
            bodyHtmlEditable += '</div></div>';
        }

        // Repeat on (days of week; dailies only)
        if (task.type === 'daily') {
            bodyHtmlEditable += '<div class="task-param-editable-js d-none"><div class="form-group task-param-repeat-js ' + (task.frequency === 'weekly' ? '' : 'd-none') + '">';
            bodyHtmlEditable += '<label>Repeat on</label><div>';
            var weekdayNames = {
                'su': 'Su',
                'm': 'Mo',
                't': 'Tu',
                'w': 'We',
                'th': 'Th',
                'f': 'Fr',
                's': 'Sa'
            };
            for (const property in task.repeat) {
                var inputId = 'task-' + task.id + '-repeat-' + property;
                bodyHtmlEditable += '<div class="form-check form-check-inline"><input class="form-check-input" type="checkbox" id="' + inputId + '" value="true"' + (task.repeat[property] === true ? ' checked' : '') + '><label class="form-check-label" for="' + inputId + '">' + weekdayNames[property] + '</label></div>';
            }
            bodyHtmlEditable += '</div></div></div>';
        }

        // Repeat on (day of month/week of month; dailies only)
        if (task.type === 'daily') {
            bodyHtmlEditable += '<div class="task-param-editable-js d-none"><div class="form-group task-param-daysweeksofmonth-js ' + (task.frequency === 'monthly' ? '' : 'd-none') + '">';
            bodyHtmlEditable += '<label>Repeat on</label><div>';
            bodyHtmlEditable += '<div class="form-check form-check-inline"><input class="form-check-input" type="radio" name="task-dayofweekmonth" id="task-' + task.id + '-dayofmonth" value="true"' + (task.daysOfMonth && task.daysOfMonth.length > 0 ? ' checked' : '') + '><label class="form-check-label" for="task-' + task.id + '-dayofmonth">This day of the month</label></div>';
            bodyHtmlEditable += '<div class="form-check form-check-inline"><input class="form-check-input" type="radio" name="task-dayofweekmonth" id="task-' + task.id + '-weekofmonth" value="true"' + (task.weeksOfMonth && task.weeksOfMonth.length > 0 ? ' checked' : '') + '><label class="form-check-label" for="task-' + task.id + '-weekofmonth">This week of the month</label></div>';
            bodyHtmlEditable += '</div></div></div>';
        }

        // Tags
        if (Object.keys(userTags).length > 0) {
            if (task.tags != null && task.tags.length > 0) {
                bodyHtmlStatic += '<tr class="task-param-static-js"><th>Tags</th><td>';
                task.tags.forEach(function (value) {
                    bodyHtmlStatic += '<span class="badge badge-pill badge-primary badge-tag">' + userTags[value] + '</span> ';
                });
                bodyHtmlStatic += '</td></tr>';
            }
            bodyHtmlEditable += '<div class="form-group task-param-editable-js d-none"><label>Tags</label><div class="row">';
            Object.keys(userTags).forEach(function (key) {
                bodyHtmlEditable += '<div class="col-xs-12 col-sm-6"><div class="form-check">';
                bodyHtmlEditable += '<input class="form-check-input task-tag-js" type="checkbox" id="task-' + task.id + '-tag-' + key + '" value="' + key + '"' + (task.hasTag(key) ? ' checked' : '') + '>';
                bodyHtmlEditable += '<label class="form-check-label" for="task-' + task.id + '-tag-' + key + '">' + userTags[key] + '</label>';
                bodyHtmlEditable += '</div></div>';
            });
            bodyHtmlEditable += '</div></div>';
        }


        bodyHtmlStatic += '</tbody></table>';


        // Footer
        footerHtml += '<div class="modal-footer">';
        footerHtml += '<div class="btn-group btn-group-sm float-right btn-group-task1-js" role="group" aria-label="Task Actions">';
        footerHtml += '<button type="button" class="btn btn-success btn-task-complete-js" data-taskid="' + task.id + '" data-tasktitle="' + taskTitleNoQuotes + '"><i class="fas fa-check"></i> Complete</button>';
        footerHtml += '<button type="button" class="btn btn-primary btn-task-edit-js"><i class="fas fa-pencil-alt"></i> Edit</button>';
        footerHtml += '<button type="button" class="btn btn-danger btn-task-delete-js" data-taskid="' + task.id + '" data-tasktitle="' + taskTitleNoQuotes + '"><i class="fas fa-trash"></i> Delete</button>';
        footerHtml += '</div>';

        footerHtml += '<div class="btn-group btn-group-sm float-right btn-group-task2-js d-none" role="group" aria-label="Task Editing Actions">';
        footerHtml += '<button type="button" class="btn btn-success btn-task-save-js" data-taskid="' + task.id + '" data-new="' + isNewTask + '"><i class="fas fa-save"></i> Save</button>';
        if (!isNewTask) {
            footerHtml += '<button type="button" class="btn btn-danger btn-task-edit-cancel-js"><i class="fas fa-times"></i> Cancel</button>';
        }
        footerHtml += '</div></div>';

        return headerHtml + '<div class="modal-body">' + bodyHtmlStatic + bodyHtmlEditable + '</div>' + footerHtml;
    }

    /**
     * Gets the HTML that'll go into a tooltip for this task.
     * @returns {string} The tooltip inner HTML
     */
    tooltipHtml() {
        var task = this;
        var tooltipHtml = '';

        if (task.notes.trim() != null && task.notes.trim() != '') {
            tooltipHtml += '<p>' + task.notes.trim() + '</p>';
        }

        if (task.checklist != null) {
            if (task.checklist.length > 0) {
                tooltipHtml += '<ul class="list-unstyled">';

                task.checklist.forEach(function (value) {
                    var liClasses = (value.completed === true ? 'text-muted' : '');
                    var iconClass = (value.completed === true ? 'far fa-check-square' : 'far fa-square');
                    var iconAriaLabel = (value.completed === true ? 'Complete' : 'Incomplete');

                    tooltipHtml += '<li' + (liClasses != '' ? ' class="' + liClasses + '"' : '') + ' data-itemid="' + value.id + '"><i class="' + iconClass + ' task-checklist-icon-js" aria-label="' + iconAriaLabel + '"></i> ' + value.text.replace('<', '&lt;').replace('>', '&gt;') + '</li>';
                });

                tooltipHtml += '</ul>';
            }
        }

        tooltipHtml += '<small>Click task for more info</small>';

        return tooltipHtml;
    }
}
