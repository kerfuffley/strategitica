import * as Utils from './utils.js';

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