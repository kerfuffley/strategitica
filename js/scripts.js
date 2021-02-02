let ID = getUrlParameter('id');
let token = getUrlParameter('token')

let strategiticaClient = '88aa06bb-ec69-43d8-b58a-e6df4aa608ac-Strategitica';

/**
 * This will help us get the name of each tag for later use.
 */
let userTags = function () {
    var tags = null;
    try {
        $.ajax({
            async: false,
            url: 'https://habitica.com/api/v3/tags',
            type: 'GET',
            dataType: 'json',
            contentType: 'application/json',
            cache: false,
            beforeSend: function (xhr) {
                xhr.setRequestHeader('x-client', strategiticaClient);
                xhr.setRequestHeader('x-api-user', ID);
                xhr.setRequestHeader('x-api-key', token);
            }
        })
        .done(function (data) {
            tags = data.data;
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
            var message = 'Couldn\'t get user tags: <br>' + jqXHR.status + ' Error';

            if ('responseJSON' in jqXHR) {
                if ('message' in jqXHR.responseJSON) {
                    message += ' - ' + jqXHR.responseJSON.message;
                }
            }

            console.log(message);
        });
    }
    catch (error) {
        console.log('Couldn\'t get user tags: ' + error.responseText);
    }

    return tags;
}();

let userTagNames = {};

if (userTags != null) {
    userTags.forEach(function (value) {
        userTagNames[value.id.toString()] = value.name;
    });
}

const monthNames = [ // [2]
    ['January', 'Jan'],
    ['February', 'Feb'],
    ['March', 'Mar'],
    ['April', 'Apr'],
    ['May', 'May'],
    ['June', 'Jun'],
    ['July', 'Jul'],
    ['August', 'Aug'],
    ['September', 'Sep'],
    ['October', 'Oct'],
    ['November', 'Nov'],
    ['December', 'Dec']
];

const frequencyPlurals = {
    'daily': 'day(s)',
    'weekly': 'week(s)',
    'monthly': 'month(s)',
    'yearly': 'year(s)'
};

loadAll();

/**
 * Load the three regions of the page: debug info, user info and the calendar.
 */
function loadAll() {
    loadDebugInfo(); 
    loadUserInfo();
    loadCalendar();
}

/**
 * Puts some debugging info on the page. Right now, all this shows is the
 * user's tag IDs so they can set certain variables to those tag IDs.
 */
function loadDebugInfo() {
    let output = `
            <p>Here are your tags and their IDs:</p>
            <div class="table-responsive">
            <table class="table table-sm">
            <thead>
            <tr>
            <th>Tag Name</th>
            <th>Tag ID</th>
            </tr>
            </thead>
            <tbody>`;

    Object.keys(userTagNames).forEach(function (key) {
        output += '<tr><td>' + userTagNames[key] + '</td>';
        output += '<td><input class="form-control" type="text" value="' + key + '" readonly></td></tr>'
    });

    output += `
            </tbody>
            </table>
            </div>`;

    $('#strategitica-debug').html(output);
}

/**
 * Changes the user's tavern status based on the isSleeping parameter. Also
 * calls {@link showTavernStatus} to update the DOM with the user's current
 * tavern status.
 * 
 * @param {boolean} isSleeping - true if the user is resting in the tavern
 * @see {@link https://habitica.com/apidoc/#api-User-UserSleep|User - Make the user start / stop sleeping (resting in the Inn)}
 */
function changeTavernStatus(isSleeping) {
    try {
        $.ajax({
            url: 'https://habitica.com/api/v3/user/sleep',
            type: 'POST',
            data: !isSleeping,
            dataType: 'json',
            contentType: 'application/json',
            cache: false,
            beforeSend: function (xhr) {
                xhr.setRequestHeader('x-client', strategiticaClient);
                xhr.setRequestHeader('x-api-user', ID);
                xhr.setRequestHeader('x-api-key', token);
            }
        })
            .done(function (data) {
                showTavernStatus(data.data);
                console.log('tavern status: ' + data.data);

                $('#strategitica-toast-success').find('.toast-title-js').html('Tavern Status');
                $('#strategitica-toast-success').find('.toast-body-js').html('You have successfully ' + (data.data === true ? 'entered' : 'left') + ' the tavern.');
                $('#strategitica-toast-success').toast('show');
            })
            .fail(function (jqXHR, textStatus, errorThrown) {
                let message = 'Couldn\'t update tavern status: <br>' + jqXHR.status + ' Error';

                if ('responseJSON' in jqXHR) {
                    if ('message' in jqXHR.responseJSON) {
                        message += ' - ' + jqXHR.responseJSON.message;
                    }
                }
    
                $('#strategitica-toast-error').find('.toast-title-js').html('Error');
                $('#strategitica-toast-error').find('.toast-body-js').html(message);
                $('#strategitica-toast-error').toast('show');
            });
    }
    catch (error) {
        $('#strategitica-tavern-change').hide();
        $('#strategitica-toast-error').find('.toast-title-js').html('Error');
        $('#strategitica-toast-error').find('.toast-body-js').html('Couldn\'t update tavern status: <br>' + error.responseText);
        $('#strategitica-toast-error').toast('show');
    }
}

/**
 * Updates the DOM with the provided tavern status.
 * 
 * @param {boolean} isSleeping - true if the user is resting in the tavern
 */
function showTavernStatus(isSleeping) {
    let tavernStatusHtml = '';
    let tavernChangeHtml = '';
    let tavernChangeUrl = '';

    if (isSleeping === true) {
        tavernStatusHtml = '<div class="bg-warning text-body text-center py-1"><small class="text-center">You are resting in the Tavern. | <a class="text-dark" href="javascript:changeTavernStatus(' + isSleeping + ');">Leave the tavern</a></small></div>';
        tavernChangeHtml = '<i class="fas fa-door-open"></i> Leave the tavern';
        tavernChangeUrl = 'javascript:changeTavernStatus(' + isSleeping + ');';
    }
    if (isSleeping === false) {
        tavernChangeHtml = '<i class="fas fa-bed"></i> Rest at the tavern';
        tavernChangeUrl = 'javascript:changeTavernStatus(' + isSleeping + ');';
    }

    $('#strategitica-tavern-status').html(tavernStatusHtml);
    $('#strategitica-tavern-change').html(tavernChangeHtml).attr('href', tavernChangeUrl);

    updateHeaderSpacing();
}

/**
 * Gets user info via the Habitica API and updates the DOM with said info. Also
 * passes the user's current tavern status to {@link changeTavernStatus}.
 * 
 * @see {@link https://habitica.com/apidoc/#api-User-UserGet|User - Get the authenticated user's profile}
 */
function loadUserInfo() {
    try {
        $.ajax({
            url: 'https://habitica.com/api/v3/user',
            type: 'GET',
            dataType: 'json',
            contentType: 'application/json',
            cache: false,
            beforeSend: function (xhr) {
                xhr.setRequestHeader('x-client', strategiticaClient);
                xhr.setRequestHeader('x-api-user', ID);
                xhr.setRequestHeader('x-api-key', token);
            }
        })
        .done(function (data) {              
            let user = data.data;
            var userName = user.auth.local.username;
            var userDisplayName = user.profile.name;
            var userClass = user.stats.class;
            var userLevel = user.stats.lvl;
            var userHealth = user.stats.hp;
            var userHealthMax = Math.floor(user.stats.maxHealth);
            var userExp = Math.floor(user.stats.exp);
            var userExpToNextLevel = user.stats.toNextLevel;
            var userMp = Math.floor(user.stats.mp);
            var userMpMax = user.stats.maxMP;

            let output = '<div class="row mx-n1">' +
                '<div class="col px-1"><h1 class="h6">' + userDisplayName + ' <small class="text-muted"><span class="pr-2">@' + userName + '</span> <span class="pr-2 text-nowrap">Level ' + userLevel + ' ' + userClass + '</span></small></h1></div>' +
                '</div>' +
                '<div class="row mx-n1">' +
                '<div class="col px-1"><div class="progress" data-toggle="tooltip" title="Health"><div class="progress-bar bg-habitica-health" role="progressbar" style="width: ' + ((userHealth / userHealthMax) * 100) + '%;" aria-valuenow="' + userHealth + '" aria-valuemin="0" aria-valuemax="' + userHealthMax + '">' + (userHealth % 1 === 0 ? userHealth : userHealth.toFixed(1)) + ' / ' + userHealthMax + '</div></div></div>' +
                '<div class="col px-1"><div class="progress" data-toggle="tooltip" title="Experience"><div class="progress-bar bg-habitica-experience" role="progressbar" style="width: ' + ((userExp / userExpToNextLevel) * 100) + '%;" aria-valuenow="' + userExp + '" aria-valuemin="0" aria-valuemax="' + userExpToNextLevel + '">' + (userExp % 1 === 0 ? userExp : userMp.userExp(1)) + ' / ' + userExpToNextLevel + '</div></div></div>' +
                '<div class="col px-1"><div class="progress" data-toggle="tooltip" title="Mana"><div class="progress-bar bg-habitica-mana" role="progressbar" style="width: ' + ((userMp / userMpMax) * 100) + '%;" aria-valuenow="' + userMp + '" aria-valuemin="0" aria-valuemax="' + userMpMax + '">' + (userMp % 1 === 0 ? userMp : userMp.toFixed(1)) + ' / ' + userMpMax + '</div></div></div>' +
                '</div>';

            $('#strategitica-user').html(output);
            showTavernStatus(user.preferences.sleep);
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
            var message = 'Couldn\'t load user info: <br>' + jqXHR.status + ' Error';

            if ('responseJSON' in jqXHR) {
                if ('message' in jqXHR.responseJSON) {
                    message += ' - ' + jqXHR.responseJSON.message;
                }
            }

            $('#strategitica-user').html(message);
        });
    } catch (error) {
        $('#strategitica-user').html(error.responseText);
    }
}

/**
 * Uses the Habitica API to complete a task. Must be called from a button (or
 * probably any interactive node really) with data-taskid="[the task ID]" and
 * data-tasktitle="[the task title]".
 * 
 * @param {Object} button - The button that called this function
 * @see {@link https://habitica.com/apidoc/#api-Task-ScoreTask|Task - Score a task}
 */
function completeTask(button) {
    var taskId = button.data('taskid');
    var taskTitle = button.data('tasktitle');

    try {
        $.ajax({
            url: 'https://habitica.com/api/v3/tasks/' + taskId + '/score/up',
            type: 'POST',
            dataType: 'json',
            contentType: 'application/json',
            cache: false,
            beforeSend: function (xhr) {
                xhr.setRequestHeader('x-client', strategiticaClient);
                xhr.setRequestHeader('x-api-user', ID);
                xhr.setRequestHeader('x-api-key', token);
            }
        })
        .done(function (data) {              
            let result = data.data;

            let message = 'Task completed!';

            if ('_tmp' in result) {
                if ('drop' in result._tmp) {
                    if ('dialog' in result._tmp.drop) {
                        message += '<br>' + result._tmp.drop.dialog;
                    }
                }
            }

            $('#modal-task .btn-task-complete-js').html('Completed! Updating page...');
            loadAll();
            $('#modal-task').modal('hide');

            $('#strategitica-toast-success').find('.toast-title-js').html(taskTitle);
            $('#strategitica-toast-success').find('.toast-body-js').html(message);
            $('#strategitica-toast-success').toast('show');
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
            let message = 'Couldn\'t complete ' + taskTitle + ': <br>' + jqXHR.status + ' Error';

            if ('responseJSON' in jqXHR) {
                if ('message' in jqXHR.responseJSON) {
                    message += ' - ' + jqXHR.responseJSON.message;
                }
            }

            $('#strategitica-toast-error').find('.toast-title-js').html('Error');
            $('#strategitica-toast-error').find('.toast-body-js').html(message);
            $('#strategitica-toast-error').toast('show');
        });
    }
    catch (error) {
        $('#modal-task').modal('hide');
        $('#strategitica-toast-error').find('.toast-title-js').html('Error');
        $('#strategitica-toast-error').find('.toast-body-js').html('Couldn\'t complete ' + taskTitle + ': <br>' + error.responseText);
        $('#strategitica-toast-error').toast('show');
    }
}

/**
 * Hides the non-editing parts of the task modal and shows the editing parts.
 */
function editTask() {
    $('#modal-task .btn-group-task1-js').addClass('d-none');
    $('#modal-task .btn-group-task2-js').removeClass('d-none');

    $('#modal-task .task-param-variable-js').removeClass('d-none');
    $('#modal-task .task-param-static-js').addClass('d-none');
}

/**
 * Basically, the opposite of {@link editTask}.
 */
function cancelEditTask() {
    $('#modal-task .btn-group-task1-js').removeClass('d-none');
    $('#modal-task .btn-group-task2-js').addClass('d-none');

    $('#modal-task .task-param-variable-js').addClass('d-none');
    $('#modal-task .task-param-static-js').removeClass('d-none');
}

/**
 * Uses the Habitica API to update a task. Must be called from a button (or
 * probably any interactive node really) with data-taskid="[the task ID]".
 * 
 * @param {Object} button - The button that called this function
 * @see {@link https://habitica.com/apidoc/#api-Task-UpdateTask|Task - Update a task}
 */
function saveTask(button, isNewTask) {
    var taskId = button.data('taskid');
    var taskText = $('#task-' + taskId + '-text-modal').val();

    if (taskText.trim() === '') {
        alert('The task title is required.');
    }
    else {
        var taskType = $('#task-' + taskId + '-type-modal').val();
        var taskNotes = $('#task-' + taskId + '-notes-modal').val();
        var taskDifficulty = parseFloat($('#task-' + taskId + '-difficulty-modal').val());

        var taskParameters = {
            'text': taskText, // task title; required
            'notes': taskNotes,
            //'date': '', // only valid for todo's; string
            'priority': taskDifficulty,
            //'reminders': '', // will add this later
            //'streak: '', // will add this later
        };

        if (isNewTask) {
            taskParameters['type'] = taskType;
        }
    
        if (taskType === 'daily') {
            var taskStartDate = new Date($('#task-' + taskId + '-startdate-modal').val() + 'T00:00:00');
            taskParameters['startDate'] = taskStartDate;
    
            var taskFrequency = $('#task-' + taskId + '-frequency-modal').val();
            taskParameters['frequency'] = taskFrequency;
    
            var taskEveryX = Math.floor($('#task-' + taskId + '-everyx-modal').val());
            taskParameters['everyX'] = taskEveryX;
    
            var isMonthlyDayOfMonth = taskFrequency === 'monthly' && $('#task-' + taskId + '-dayofmonth-modal').is(':checked') ? true : false;
            var isMonthlyWeekOfMonth = taskFrequency === 'monthly' && $('#task-' + taskId + '-weekofmonth-modal').is(':checked') ? true : false;
    
            var taskRepeat = {};
    
            if (isMonthlyDayOfMonth || isMonthlyWeekOfMonth) {
                taskRepeat = {
                    'm': taskStartDate.getDay() === 1 ? true : false,
                    't': taskStartDate.getDay() === 2 ? true : false,
                    'w': taskStartDate.getDay() === 3 ? true : false,
                    'th': taskStartDate.getDay() === 4 ? true : false,
                    'f': taskStartDate.getDay() === 5 ? true : false,
                    's': taskStartDate.getDay() === 6 ? true : false,
                    'su': taskStartDate.getDay() === 0 ? true : false
                };
            }
            else {
                taskRepeat = {
                    'm': $('#task-' + taskId + '-repeat-m-modal').is(':checked') ? true : false,
                    't': $('#task-' + taskId + '-repeat-t-modal').is(':checked') ? true : false,
                    'w': $('#task-' + taskId + '-repeat-w-modal').is(':checked') ? true : false,
                    'th': $('#task-' + taskId + '-repeat-th-modal').is(':checked') ? true : false,
                    'f': $('#task-' + taskId + '-repeat-f-modal').is(':checked') ? true : false,
                    's': $('#task-' + taskId + '-repeat-s-modal').is(':checked') ? true : false,
                    'su': $('#task-' + taskId + '-repeat-su-modal').is(':checked') ? true : false
                };
            }
    
            taskParameters['repeat'] = taskRepeat;
    
    
            var taskDaysOfMonth = [];
    
            if (isMonthlyDayOfMonth) {
                taskDaysOfMonth[0] = taskStartDate.getDate();
            }
    
            taskParameters['daysOfMonth'] = taskDaysOfMonth;
    
    
            var taskWeeksOfMonth = [];
    
            if (isMonthlyWeekOfMonth) {
                if (taskStartDate.getDate() <= 7) {
                    taskWeeksOfMonth[0] = 0;
                }
                else if (taskStartDate.getDate() <= 14) {
                    taskWeeksOfMonth[0] = 1;
                }
                else if (taskStartDate.getDate() <= 21) {
                    taskWeeksOfMonth[0] = 2;
                }
                else if (taskStartDate.getDate() <= 28) {
                    taskWeeksOfMonth[0] = 3;
                }
                else if (taskStartDate.getDate() <= 31) {
                    taskWeeksOfMonth[0] = 4;
                }
            }
            
            taskParameters['weeksOfMonth'] = taskWeeksOfMonth;
        }

        var taskTags = [];

        $('#modal-task input[type="checkbox"].task-tag-js:checked').each(function() {
            taskTags.push($(this).val());
        });

        taskParameters['tags'] = taskTags;
    
        try {
            $.ajax({
                url: 'https://habitica.com/api/v3/tasks/' + (isNewTask ? 'user' : taskId),
                type: isNewTask ? 'POST' : 'PUT',
                data: JSON.stringify(taskParameters),
                dataType: 'json',
                contentType: 'application/json',
                cache: false,
                beforeSend: function (xhr) {
                    xhr.setRequestHeader('x-client', strategiticaClient);
                    xhr.setRequestHeader('x-api-user', ID);
                    xhr.setRequestHeader('x-api-key', token);
                }
            })
            .done(function (data) {
                let message = 'Task successfully saved.';
    
                $('#modal-task .btn-task-edit-done-js').html('Saved! Updating page...');
                loadAll();
                $('#modal-task').modal('hide');
    
                $('#strategitica-toast-success').find('.toast-title-js').html(taskText);
                $('#strategitica-toast-success').find('.toast-body-js').html(message);
                $('#strategitica-toast-success').toast('show');
            })
            .fail(function (jqXHR, textStatus, errorThrown) {
                let message = 'Couldn\'t save ' + taskText + ': <br>' + jqXHR.status + ' Error';
    
                if ('responseJSON' in jqXHR) {
                    if ('message' in jqXHR.responseJSON) {
                        message += ' - ' + jqXHR.responseJSON.message;
                    }
                }
    
                $('#strategitica-toast-error').find('.toast-title-js').html('Error');
                $('#strategitica-toast-error').find('.toast-body-js').html(message);
                $('#strategitica-toast-error').toast('show');
            });
        }
        catch (error) {
            $('#modal-task').modal('hide');
            $('#strategitica-toast-error').find('.toast-title-js').html('Error');
            $('#strategitica-toast-error').find('.toast-body-js').html('Couldn\'t save ' + taskText + ': <br>' + error.responseText);
            $('#strategitica-toast-error').toast('show');
        }
    }
}

/**
 * Uses the Habitica API to delete a task. Must be called from a button (or
 * probably any interactive node really) with data-taskid="[the task ID]" and
 * data-tasktitle="[the task title]".
 * 
 * @param {Object} button - The button that called this function
 * @see {@link https://habitica.com/apidoc/#api-Task-DeleteTask|Task - Delete a task}
 */
function deleteTask(button) {
    if (confirm('Are you sure you want to delete this task?')) {
        var taskId = button.data('taskid');
        var taskTitle = button.data('tasktitle');

        try {
            $.ajax({
                url: 'https://habitica.com/api/v3/tasks/' + taskId,
                method: 'DELETE',
                dataType: 'json',
                contentType: 'application/json',
                beforeSend: function (xhr) {
                    xhr.setRequestHeader('x-client', strategiticaClient);
                    xhr.setRequestHeader('x-api-user', ID);
                    xhr.setRequestHeader('x-api-key', token);
                }
            })
            .done(function (data) {  
                let message = 'Task deleted successfully.';
    
                $('#modal-task .btn-task-delete-js').html('Deleted. Updating page...');
                loadAll();
                $('#modal-task').modal('hide');
    
                $('#strategitica-toast-success').find('.toast-title-js').html(taskTitle);
                $('#strategitica-toast-success').find('.toast-body-js').html(message);
                $('#strategitica-toast-success').toast('show');
            })
            .fail(function (jqXHR, textStatus, errorThrown) {
                let message = 'Couldn\'t delete task: <br>' + jqXHR.status + ' Error';
    
                if ('responseJSON' in jqXHR) {
                    if ('message' in jqXHR.responseJSON) {
                        message += ' - ' + jqXHR.responseJSON.message;
                    }
                }
    
                $('#modal-task').modal('hide');
    
                $('#strategitica-toast-error').find('.toast-title-js').html(taskTitle);
                $('#strategitica-toast-error').find('.toast-body-js').html(message);
                $('#strategitica-toast-error').toast('show');
            });
        }
        catch (error) {
            $('#modal-task').modal('hide');
            $('#strategitica-toast-error').find('.toast-title-js').html(taskTitle);
            $('#strategitica-toast-error').find('.toast-body-js').html('Couldn\'t delete task: <br>' + error.responseText);
            $('#strategitica-toast-error').toast('show');
        }
    }
}

/**
 * Uses the Habitica API to check or uncheck a checklist item. Must be called
 * from a checkbox (or probably any interactive node really) with
 * data-taskid="[the task ID]", data-itemtitle="[the checklist item title]" and
 * data-itemid="[the checklist item ID]".
 * 
 * @param {Object} checkbox - The checkbox that called this function
 * @see {@link https://habitica.com/apidoc/#api-Task-ScoreChecklistItem|Task - Score a checklist item}
 */
function scoreChecklistItem(checkbox) {
    var taskId = checkbox.data('taskid');
    var itemTitle = checkbox.data('itemtitle');
    var itemId = checkbox.data('itemid');

    try {
        $.ajax({
            url: 'https://habitica.com/api/v3/tasks/' + taskId + '/checklist/' + itemId + '/score',
            method: 'POST',
            dataType: 'json',
            contentType: 'application/json',
            beforeSend: function (xhr) {
                xhr.setRequestHeader('x-client', strategiticaClient);
                xhr.setRequestHeader('x-api-user', ID);
                xhr.setRequestHeader('x-api-key', token);
            }
        })
        .done(function (data) {              
            loadCalendar();
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
            let message = 'Couldn\'t score checklist item: <br>' + jqXHR.status + ' Error';

            if ('responseJSON' in jqXHR) {
                if ('message' in jqXHR.responseJSON) {
                    message += ' - ' + jqXHR.responseJSON.message;
                }
            }

            $('#strategitica-toast-error').find('.toast-title-js').html(itemTitle);
            $('#strategitica-toast-error').find('.toast-body-js').html(message);
            $('#strategitica-toast-error').toast('show');
        });
    }
    catch (error) {
        $('#modal-task').modal('hide');
        $('#strategitica-toast-error').find('.toast-title-js').html(itemTitle);
        $('#strategitica-toast-error').find('.toast-body-js').html('Couldn\'t score checklist item: <br>' + error.responseText);
        $('#strategitica-toast-error').toast('show');
    }
}

/**
 * This basically gets the user's task list via the Habitica API and sorts it
 * so it can be put in calendar format. The more complex version is this:
 * 1.   Get the user's tasks via the API.
 * 2.   Provide some basic info, including but not limited to what the name of
 *      each day of the week is, and how many days into the future this
 *      calendar should be limited to.
 * 3.   Create an object, which will contain a bunch of arrays. Essentially,
 *      we're creating a list of dates that have tasks due, and each of those
 *      dates will be tied to that date's list of tasks. Also, each item in
 *      that list of tasks will be tied to a task ID. So, the index of the
 *      first array "tier" will represent a date, and the index of the second
 *      array "tier" will be a task ID. It's important for the task ID to be
 *      there because we'll use it later on to ensure a task doesn't appear
 *      twice in the same day (don't ask me how or why this happens, I just
 *      know that it does).
 * 4.   Go through each task and determine if it should be in the calendar. It
 *      shouldn't be included if its due date is too far in the future, or if
 *      its due date is today but it's been completed. If its due date is in
 *      the past, we can include it--we'll just consider its due date to be
 *      today so that those tasks can still be completed, albeit a bit late. If
 *      the task should be included, add it to the array for its due date. This
 *      is done for each task's future due dates as well.
 * 5.   Start coming up with the calendar HTML. Regardless of what day it is
 *      today, we need to start off the calendar with the current month,
 *      including past days up to yesterday, because a calendar that begins
 *      mid-month looks weird. Those days need to be styled to look different
 *      so it's clear to the user that they're days in the past.
 * 6.   Go through each date from today onward and, if the current date exists
 *      in the list of dates with tasks due, add HTML for each task to a
 *      container for that day. We'll keep doing this until we've reached the
 *      day limit for the calendar. Each task will have some data-* attributes
 *      (see {@link getTaskHtml}) we'll use later to associate the task with
 *      some tooltip and modal text. As we're looping through the days and
 *      tasks, we'll also...
 *      a.  Check if each day is at the beginning or end of the week or month
 *          so that things can get aligned properly, and so that month and week
 *          labels can get added at the start of each new month.
 *      b.  Start adding up the difficulty of each task to come up with a
 *          difficulty rating for the day.
 *      c.  Determine if each task has a tag for a certain time of day:
 *          morning, afternoon and evening. If a task has exactly one of those
 *          tags, we'll put it into an array for that time of day; if it has
 *          none of those tags or two or more of those tags, we'll put it in a
 *          "whenever" array. This way, we can sort tasks by time of day.
 *      d.  Generate some tooltip and modal HTML associated with each task (see
 *          {@link getTaskTooltipHtml} and {@link getTaskModalHtml}) and add
 *          that HTML string to two respective arrays. We'll be dealing with
 *          that info shortly.
 * 7.   Once we've looped through all the days, we'll simply loop through
 *      everything in the tooltip and modal HTML arrays and append each chunk
 *      of HTML to a node with a unique ID that includes the task ID. This is
 *      how the task in the calendar and its tooltip and modal will be
 *      associated with one another.
 * 8.   Finally, the calendar HTML is added to the DOM, and each of the tooltip
 *      and modal nodes get appended to a hidden node in the DOM as well. Now
 *      that the DOM knows about the calendar, we need to start up
 *      {@link startTaskInteractiveness} too.
 * 
 * @todo Currently, future due dates are limited to whichever future due dates
 * the Habitica API provides, which seems to be the next ~6-7 due dates. I'm
 * hoping I can come up with something to get due dates beyond that because,
 * for tasks that occur very often, it sucks to only be able to accurately see
 * a week or so into the future.
 */
function loadCalendar() {
    try {
        $.ajax({ // [1]
            url: 'https://habitica.com/api/v3/tasks/user',
            type: 'GET',
            dataType: 'json',
            contentType: 'application/json',
            cache: false,
            beforeSend: function (xhr) {
                xhr.setRequestHeader('x-client', strategiticaClient);
                xhr.setRequestHeader('x-api-user', ID);
                xhr.setRequestHeader('x-api-key', token);
            }
        })
        .done(function (data) {
            let tasks = data.data;
            let output = '';

            let today = new Date(); // [2]
            let thisMonth = today.getMonth(); // [2]
            let firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1); // [2]
            let firstOfMonthDayOfWeek = firstOfMonth.getDay(); // [2]

            let calendarDaysLimit = 186; // [2]
            let today2 = new Date();
            let calendarLastDay = new Date(today2.setDate(today2.getDate() + calendarDaysLimit)); // [2]
            let weekDayNames = [ // [2]
                ['Sunday', 'Sun'],
                ['Monday', 'Mon'],
                ['Tuesday', 'Tue'],
                ['Wednesday', 'Wed'],
                ['Thursday', 'Thu'],
                ['Friday', 'Fri'],
                ['Saturday', 'Sat']
            ];
            let datesWithTasksDue = {}; // [3]

            for (var i = 0; i < tasks.length; i++) { // [4]
                var task = tasks[i];

                if (task.startDate != null || task.nextDue != null) {
                    if (task.startDate != null) {
                        var startDate = new Date(task.startDate);

                        if (startDate < today) { // [4]
                            if (task.isDue != null && task.isDue === true) {
                                startDate = today; // [4]
                            }
                            else {
                                startDate = null;
                            }
                        }

                        if (startDate != null) {
                            var shouldAddTask = true;

                            if (startDate > calendarLastDay) { // [4]
                                shouldAddTask = false;
                            }

                            if (startDate.setHours(0, 0, 0, 0) === today.setHours(0, 0, 0, 0) && task.completed === true) { // [4]
                                shouldAddTask = false;
                            }

                            if (shouldAddTask) {
                                var startDateKey = getDateKey(startDate); // [3]

                                if (!(startDateKey in datesWithTasksDue)) {
                                    datesWithTasksDue[startDateKey] = []; // [3]
                                }

                                if (!(task.id in datesWithTasksDue[startDateKey])) {
                                    datesWithTasksDue[startDateKey][task.id] = task; // [3], [4]
                                }
                            }
                        }
                    }

                    if (task.nextDue != null && task.nextDue.length > 0) {
                        if (!isOneTimeDaily(task)) {
                            task.nextDue.forEach(function (value) {
                                var startDate = new Date(task.startDate);
                                var currentDay = new Date(value);
                                var currentDayKey = getDateKey(currentDay); // [3]

                                var shouldAddTask = true;

                                if (currentDay > calendarLastDay) { // [4]
                                    shouldAddTask = false;
                                }

                                if (shouldAddTask) {
                                    if (!(currentDayKey in datesWithTasksDue)) {
                                        datesWithTasksDue[currentDayKey] = []; // [3]
                                    }

                                    if (!(task.id in datesWithTasksDue[currentDayKey])) {
                                        datesWithTasksDue[currentDayKey][task.id] = task; // [3], [4]
                                    }
                                }
                            });
                        }
                    }
                }
            }

            var weekLabels = '<div class="calendar-week">'; // [5]

            weekDayNames.forEach(function (value) { // [2], [5]
                weekLabels += '<div class="calendar-label-week">';
                weekLabels += '<span class="d-none d-lg-inline">' + value[0] + '</span>';
                weekLabels += '<span class="d-none d-md-block d-lg-none">' + value[1] + '</span>';
                weekLabels += '</div>';
            });

            weekLabels += '</div>';

            output += '<div class="calendar-label-month">' + monthNames[today.getMonth()][0] + ' ' + today.getFullYear() + '</div><div class="clearfix"></div>' + weekLabels; // [5]

            for (var i = 1; i < today.getDate(); i++) { // [5]
                var thisDate = new Date(today.getFullYear(), today.getMonth(), i);

                if (i === 1 || thisDate.getDay() === 0) { // if this day is the first of the month OR if this day is Sunday
                    output += '<div class="calendar-week">';
                }

                output += '<div class="calendar-day calendar-day-past' + (i === 1 ? ' calendar-day-offset' + firstOfMonthDayOfWeek : '') + ' d-none d-md-block"><div class="p-1"><span class="calendar-label-day">' + i + '</span></div></div>'; // [5]

                if (thisDate.getDay() === 6) { // if this day is Saturday
                    output += '</div><!-- end .calendar-week -->';
                }
            }

            var dayCounter = 0; // [6]
            var tasksTooltipText = {}; // [6d]
            var tasksModalText = {}; // [6d]

            for (var i = today.getDate(); i <= calendarDaysLimit; i++) { // [6]
                var currentDay = new Date(today);
                currentDay.setDate(currentDay.getDate() + dayCounter);

                if (currentDay.getMonth() != thisMonth) { // [6a]
                    output += '<div class="calendar-label-month">' + monthNames[currentDay.getMonth()][0] + ' ' + currentDay.getFullYear() + '</div>' + weekLabels; // [6a]

                    thisMonth = currentDay.getMonth(); // [6a]
                }

                var currentDayKey = getDateKey(currentDay); // [3]
                var dayTasks = '';
                var difficultyRating = 0; // [6b]
                var dayDuration = 0;
                var dayDurationAsterisk = false;

                if (currentDayKey in datesWithTasksDue) { // [3], [6]
                    var morningTasks = []; // [6c]
                    var afternoonTasks = []; // [6c]
                    var eveningTasks = []; // [6c]
                    var otherTasks = []; // [6c]

                    Object.keys(datesWithTasksDue[currentDayKey]).forEach(function (key) { // [3], [6]
                        var task = datesWithTasksDue[currentDayKey][key]; // [3]
                        var timeOfDayTags = 0; // [6c]
                        var hasMorningTag = hasTimeOfDayTag(task, 'morning'); // [6c]
                        var hasAfternoonTag = hasTimeOfDayTag(task, 'afternoon'); // [6c]
                        var hasEveningTag = hasTimeOfDayTag(task, 'evening'); // [6c]

                        if (typeof task.priority === 'number') {
                            difficultyRating += task.priority; // [6b]
                        }

                        if (hasMorningTag) {
                            timeOfDayTags++; // [6c]
                        }
                        if (hasAfternoonTag) {
                            timeOfDayTags++; // [6c]
                        }
                        if (hasEveningTag) {
                            timeOfDayTags++; // [6c]
                        }

                        if (timeOfDayTags === 1) { // [6c]
                            if (hasMorningTag) {
                                morningTasks.push(task); // [6c]
                            }
                            if (hasAfternoonTag) {
                                afternoonTasks.push(task); // [6c]
                            }
                            if (hasEveningTag) {
                                eveningTasks.push(task); // [6c]
                            }
                        }
                        else {
                            otherTasks.push(task); // [6c]
                        }
                    });

                    if (morningTasks.length > 0) { // [6c]
                        var badgesHtml = '';
                        var timeOfDayDuration = 0;
                        var timeOfDayDurationAsterisk = false;

                        morningTasks.forEach(function (value) {
                            var taskDuration = getTaskDuration(value);
                            dayDuration += taskDuration;
                            timeOfDayDuration += taskDuration;
                            if (taskDuration === 0) {
                                dayDurationAsterisk = true;
                                timeOfDayDurationAsterisk = true;
                            }

                            var tooltipHtml = getTaskTooltipHtml(value); // [6d]
                            var modalHtml = getTaskModalHtml(value); // [6d]
                            badgesHtml += getTaskHtml(value); // [6]

                            if (!(value.id in tasksTooltipText)) {
                                tasksTooltipText[value.id] = tooltipHtml; // [6d]
                            }

                            if (!(value.id in tasksModalText)) {
                                tasksModalText[value.id] = modalHtml; // [6d]
                            }
                        });

                        dayTasks += '<div><small>Morning:</small>' + (timeOfDayDuration > 0 ? ' <span class="badge badge-pill badge-light float-right" title="Morning tasks duration' + (timeOfDayDurationAsterisk ? ' (may be inaccurate since the duration for one or more tasks couldn\'t be determined)' : '') + '">' + formatTaskDuration(timeOfDayDuration) + (timeOfDayDurationAsterisk ? '*' : '') + '</span>' : '') + '</div>' + badgesHtml;
                    }

                    if (afternoonTasks.length > 0) { // [6c]
                        var badgesHtml = '';
                        var timeOfDayDuration = 0;
                        var timeOfDayDurationAsterisk = false;

                        afternoonTasks.forEach(function (value) {
                            var taskDuration = getTaskDuration(value);
                            dayDuration += taskDuration;
                            timeOfDayDuration += taskDuration;
                            if (taskDuration === 0) {
                                dayDurationAsterisk = true;
                                timeOfDayDurationAsterisk = true;
                            }

                            var tooltipHtml = getTaskTooltipHtml(value); // [6d]
                            var modalHtml = getTaskModalHtml(value); // [6d]
                            badgesHtml += getTaskHtml(value); // [6]

                            if (!(value.id in tasksTooltipText)) {
                                tasksTooltipText[value.id] = tooltipHtml; // [6d]
                            }

                            if (!(value.id in tasksModalText)) {
                                tasksModalText[value.id] = modalHtml; // [6d]
                            }
                        });

                        dayTasks += '<div><small>Afternoon:</small>' + (timeOfDayDuration > 0 ? ' <span class="badge badge-pill badge-light float-right" title="Afternoon tasks duration' + (timeOfDayDurationAsterisk ? ' (may be inaccurate since the duration for one or more tasks couldn\'t be determined)' : '') + '">' + formatTaskDuration(timeOfDayDuration) + (timeOfDayDurationAsterisk ? '*' : '') + '</span>' : '') + '</div>' + badgesHtml;
                    }

                    if (eveningTasks.length > 0) { // [6c]
                        var badgesHtml = '';
                        var timeOfDayDuration = 0;
                        var timeOfDayDurationAsterisk = false;

                        eveningTasks.forEach(function (value) {
                            var taskDuration = getTaskDuration(value);
                            dayDuration += taskDuration;
                            timeOfDayDuration += taskDuration;
                            if (taskDuration === 0) {
                                dayDurationAsterisk = true;
                                timeOfDayDurationAsterisk = true;
                            }

                            var tooltipHtml = getTaskTooltipHtml(value); // [6d]
                            var modalHtml = getTaskModalHtml(value); // [6d]
                            badgesHtml += getTaskHtml(value); // [6]

                            if (!(value.id in tasksTooltipText)) {
                                tasksTooltipText[value.id] = tooltipHtml; // [6d]
                            }

                            if (!(value.id in tasksModalText)) {
                                tasksModalText[value.id] = modalHtml; // [6d]
                            }
                        });

                        dayTasks += '<div><small>Evening:</small>' + (timeOfDayDuration > 0 ? ' <span class="badge badge-pill badge-light float-right" title="Evening tasks duration' + (timeOfDayDurationAsterisk ? ' (may be inaccurate since the duration for one or more tasks couldn\'t be determined)' : '') + '">' + formatTaskDuration(timeOfDayDuration) + (timeOfDayDurationAsterisk ? '*' : '') + '</span>' : '') + '</div>' + badgesHtml;
                    }

                    if (otherTasks.length > 0) { // [6c]
                        var badgesHtml = '';
                        var timeOfDayDuration = 0;
                        var timeOfDayDurationAsterisk = false;

                        otherTasks.forEach(function (value) {
                            var taskDuration = getTaskDuration(value);
                            dayDuration += taskDuration;
                            timeOfDayDuration += taskDuration;
                            if (taskDuration === 0) {
                                dayDurationAsterisk = true;
                                timeOfDayDurationAsterisk = true;
                            }

                            var tooltipHtml = getTaskTooltipHtml(value); // [6d]
                            var modalHtml = getTaskModalHtml(value); // [6d]
                            badgesHtml += getTaskHtml(value); // [6]

                            if (!(value.id in tasksTooltipText)) {
                                tasksTooltipText[value.id] = tooltipHtml; // [6d]
                            }

                            if (!(value.id in tasksModalText)) {
                                tasksModalText[value.id] = modalHtml; // [6d]
                            }
                        });

                        if (morningTasks.length > 0 || afternoonTasks.length > 0 || eveningTasks.length > 0) {
                            dayTasks += '<div><small>Whenever:</small>' + (timeOfDayDuration > 0 ? ' <span class="badge badge-pill badge-light float-right" title="Other tasks duration' + (timeOfDayDurationAsterisk ? ' (may be inaccurate since the duration for one or more tasks couldn\'t be determined)' : '') + '">' + formatTaskDuration(timeOfDayDuration) + (timeOfDayDurationAsterisk ? '*' : '') + '</span>' : '') + '</div>';
                        }

                        dayTasks += badgesHtml;
                    }
                }

                if (currentDay.getDay() === 0 || currentDay.getDate() === 1) { // [6a]
                    output += '<div class="calendar-week">';
                }

                output += '<div class="calendar-day' + (dayCounter % 2 === 0 ? '' : ' calendar-day-alternate') + (currentDay.getDay() === 0 || currentDay.getDay() === 6 ? ' calendar-day-weekend' : '') + (currentDay.getDate() === 1 ? ' calendar-day-offset' + currentDay.getDay() : '') + '">' + 
                '<div class="p-1">' + 
                '<span class="calendar-label-day">' + 
                '<span class="d-md-none">' + weekDayNames[currentDay.getDay()][1] + ', ' + monthNames[thisMonth][1] + '</span> ' + 
                currentDay.getDate() +  
                //' <span class="badge badge-pill badge-light float-right" title="Difficulty rating"><i class="fas fa-star" aria-hidden="true"></i>' + (difficultyRating % 1 === 0 ? difficultyRating : difficultyRating.toFixed(1)) + '</span>' + 
                ' <span class="badge badge-pill badge-light float-right" title="Total tasks duration' + (dayDurationAsterisk ? ' (may be inaccurate since the duration for one or more tasks couldn\'t be determined)' : '') + '">' + formatTaskDuration(dayDuration) + (dayDurationAsterisk ? '*' : '') + '</span>' + 
                '</span>' + 
                dayTasks + 
                '</div>' + 
                '</div>'; // [6]

                if (currentDay.getDay() === 6 || currentDay.getDate() === getLastDayOfMonth(currentDay.getFullYear(), currentDay.getMonth()) || dayCounter === calendarDaysLimit) { // [6a]
                    output += '</div><!-- end .calendar-week -->';
                }

                dayCounter = dayCounter + 1; // [6]
            }

            let interactiveDescriptions = ''; // [7]

            Object.keys(tasksTooltipText).forEach(function (key) {
                interactiveDescriptions += '<div id="task-' + key + '-tooltip">' + tasksTooltipText[key] + '</div>'; // [6d], [7]
            });

            Object.keys(tasksModalText).forEach(function (key) {
                interactiveDescriptions += '<div id="task-' + key + '-modal">' + tasksModalText[key] + '</div>'; // [6d], [7]
            });

            var newTask = {
                id: 'new',
                text: 'New Task',
                type: 'daily',
                priority: 1,
                frequency: 'weekly',
                repeat: {
                    'su': true,
                    'm': true,
                    't': true,
                    'w': true,
                    'th': true,
                    'f': true,
                    's': true
                },
                everyX: 1,
                tags: []
            };

            interactiveDescriptions += '<div id="task-new-modal">' + getTaskModalHtml(newTask) + '</div>';

            $('#strategitica-calendar').html(output); // [6], [8]
            $('#strategitica-descriptions').html(interactiveDescriptions); // [6d], [7], [8]

            startTaskInteractiveness(); // [8]
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
            let message = 'Couldn\'t load calendar: <br>' + jqXHR.status + ' Error';

            if ('responseJSON' in jqXHR) {
                if ('message' in jqXHR.responseJSON) {
                    message += ' - ' + jqXHR.responseJSON.message;
                }
            }

            $('#strategitica-calendar').html(message);
        });
    } catch (error) {
        $('#strategitica-calendar').html('Couldn\'t load calendar: <br>' + error.responseText);
    }
};

/**
 * Gets a URL parameter by its name.
 * @param {string} name - The parameter name
 */
function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
};

/**
 * You can't just output a Date variable in JS and expect it to look readable,
 * and for debugging purposes, I want things to be readable. So this is here to
 * create understandable keys for the big fat date/task object in
 * {@link loadCalendar}. Also, I needed dates to be formatted in a way that an
 * input element with type="date" could work with.
 * @param {Date} date 
 * @returns {string} A readable version of a given date
 */
function getDateKey(date) {
    return date.getUTCFullYear() + '-' + (date.getUTCMonth() <= 8 ? '0' : '') + (date.getUTCMonth() + 1) + '-' + (date.getUTCDate() <= 9 ? '0' : '') + date.getUTCDate();
}

/**
 * Check if a given task has a given tag (by tag ID).
 * @param {*} task - The task to check
 * @param {*} tagId - The tag ID to look for
 * @returns {boolean} true if the tag is found
 */
function taskHasTag(task, tagId) {
    var hasTag = Object.keys(task.tags).some(function (i) {
        return task.tags[i] === tagId;
    });

    return hasTag;
}

function isOneTimeDaily(task) {
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
            return taskHasTag(task, oneTimeDailyTagId);
        }
    }
    else {
        return false;
    }
}

function hasTimeOfDayTag(task, timeOfDay) {
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
            return taskHasTag(task, timeOfDayTagId);
        }
    }
    else {
        return false;
    }
}


/**
 * Ahem, uh, in case you didn't know, some months have 30 days, some have 31...
 * some even have 28 or 29! This determines what the last day of the month is
 * for a given month and year.
 * @param {number} year - The year, i.e. 2020
 * @param {number} month - The month, e.g. 0 for January, 1 for February, etc.
 * @returns {number} The last day of the given month and year, e.g. 31
 */
function getLastDayOfMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

/**
 * Gets the HTML for a given task to put in the calendar.
 * @param {Object} task 
 * @returns {string} The task HTML
 */
function getTaskHtml(task) {
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

    var taskDuration = getTaskDuration(task);

    var taskTitleNoQuotes = task.text.replace('"', '&quot;');

    var taskHtml = '<button type="button" class="badge badge-task badge-task-js badge-' + badgeDifficultyClass + ' badge-' + badgeValueClass + '" data-taskid="' + task.id + '" title="' + taskTitleNoQuotes + '" data-tasktitle="' + taskTitleNoQuotes + '"><span class="badge-title">' + task.text.replace('<', '&lt;').replace('>', '&gt;') + '</span><span class="sr-only">(Task value: ' + badgeValueDescription + '; Task difficulty: ' + badgeDifficultyDescription + ')</span>' + (taskDuration > 0 ? '<span class="badge-addon">' + formatTaskDuration(taskDuration) + '</span>' : '') + '</button>';

    return taskHtml;
}

/**
 * Gets the HTML that'll go into a tooltip for a given task.
 * @param {Object} task 
 * @returns {string} The tooltip inner HTML
 */
function getTaskTooltipHtml(task) {
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

/**
 * Gets the HTML that'll go into a modal for a given task.
 * @param {Object} task 
 * @returns {string} The modal inner HTML
 */
function getTaskModalHtml(task) {
    var modalHtmlHeader = '';
    var modalHtmlStatic = '';
    var modalHtmlVariable = '';
    var modalHtmlFooter = '';
    var isNewTask = task.id === 'new';

    var taskTitleNoQuotes = task.text ? task.text.replace('"', '&quot;') : '';

    // Header
    modalHtmlHeader += '<div class="modal-header">';
    modalHtmlHeader += '<h5 class="modal-title task-param-static-js" id="modal-task-' + task.id + '-label">' + (isNewTask ? 'New Task' : task.text) + '</h5>';
    modalHtmlHeader += '<div class="form-group task-param-variable-js d-none"><label for="task-' + task.id + '-text" class="sr-only">Title</label><input type="text" class="form-control form-control-lg" id="task-' + task.id + '-text" value="' + taskTitleNoQuotes + '" placeholder="Task title"></div>';
    modalHtmlHeader += '<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>';
    modalHtmlHeader += '</div>'; // end .modal-header

    // Task ID
    modalHtmlVariable += '<input type="hidden" id="task-' + task.id + '-type" value="' + task.type + '">';


    // Notes
    if (task.notes && task.notes.trim() != null && task.notes.trim() != '') {
        modalHtmlStatic += '<p class="task-param-static-js">' + task.notes.trim() + '</p>';
    }
    modalHtmlVariable += '<div class="form-group task-param-variable-js d-none"><label for="task-' + task.id + '-notes">Notes</label><textarea class="form-control form-control-sm" id="task-' + task.id + '-notes" rows="3" placeholder="Add notes">' + (task.notes ? task.notes.trim() : '') + '</textarea></div>';


    // Checklist
    if (task.checklist != null) {
        if (task.checklist.length > 0) {
            modalHtmlStatic += '<ul class="list-unstyled task-param-static-js">';

            task.checklist.forEach(function (value) {
                modalHtmlStatic += '<li><div class="form-check">' +
                '<input class="form-check-input task-checklist-item-js" type="checkbox" value="" id="checklist-' + value.id + '"' + (value.completed === true ? ' checked' : '') +' data-taskid="' + task.id + '" data-itemtitle="' + value.text.replace('"', '&quot;') + '" data-itemid="' + value.id + '">' + 
                '<label class="form-check-label" for="checklist-' + value.id +'">' + value.text.replace('<', '&lt;').replace('>', '&gt;') +'</label>' +
                '</div></li>';
            });

            modalHtmlStatic += '</ul>';
        }
    }

    modalHtmlStatic += '<table class="table table-sm table-borderless"><tbody>';

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
    modalHtmlStatic += difficultyHtml;
    modalHtmlVariable += '<div class="form-group task-param-variable-js d-none"><label for="task-' + task.id + '-difficulty">Difficulty</label><select class="form-control form-control-sm" name="task-difficulty" id="task-' + task.id + '-difficulty">';
    modalHtmlVariable += '<option value="0.1"' + (task.priority < 1 ? ' selected' : '') + '>' + difficultyStar + ' Trivial</option>';
    modalHtmlVariable += '<option value="1"' + (task.priority === 1 ? ' selected' : '') + '>' + difficultyStar + difficultyStar + ' Easy</option>';
    modalHtmlVariable += '<option value="1.5"' + (task.priority === 1.5 ? ' selected' : '') + '>' + difficultyStar + difficultyStar + difficultyStar + ' Medium</option>';
    modalHtmlVariable += '<option value="2"' + (task.priority >= 2 ? ' selected' : '') + '>' + difficultyStar + difficultyStar + difficultyStar + difficultyStar + ' Hard</option>';
    modalHtmlVariable += '</select></div>';

    // Start date (dailies only)
    if (task.type === 'daily') {
        modalHtmlVariable += '<div class="form-group task-param-variable-js d-none"><label for="task-' + task.id + '-startdate">Start date</label><input type="date" class="form-control form-control-sm" id="task-' + task.id + '-startdate" value="' + (task.startDate ? getDateKey(new Date(task.startDate)) : getDateKey(new Date())) + '"></input></div>';
    }

    // Frequency (dailies only)
    if (getTaskFrequencyHtml(task) != '') {
        modalHtmlStatic += '<tr class="task-param-static-js"><th>Frequency</th><td>' + getTaskFrequencyHtml(task) + '</td></tr>';
    }
    if (task.type === 'daily') {
        modalHtmlVariable += '<div class="form-group task-param-variable-js d-none"><label for="task-' + task.id + '-frequency">Repeats</label><select class="form-control form-control-sm" name="task-frequency" id="task-' + task.id + '-frequency">';
        modalHtmlVariable += '<option value="daily"' + (task.frequency === 'daily' ? ' selected' : '') + '>Daily</option>';
        modalHtmlVariable += '<option value="weekly"' + (task.frequency === 'weekly' ? ' selected' : '') + '>Weekly</option>';
        modalHtmlVariable += '<option value="monthly"' + (task.frequency === 'monthly' ? ' selected' : '') + '>Monthly</option>';
        modalHtmlVariable += '<option value="yearly"' + (task.frequency === 'yearly' ? ' selected' : '') + '>Yearly</option>';
        modalHtmlVariable += '</select></div>';
    }

    // EveryX (dailies only)
    if (task.type === 'daily') {
        modalHtmlVariable += '<div class="form-group task-param-variable-js d-none">';
        modalHtmlVariable += '<label for="task-' + task.id + '-everyx">Repeat every</label>';
        modalHtmlVariable += '<div class="input-group input-group-sm">';
        modalHtmlVariable += '<input type="number" class="form-control" name="task-everyx" id="task-' + task.id + '-everyx" value="' + task.everyX + '" min="0" max="9999" aria-describedby="task-' + task.id + '-everyx-addon">';
        modalHtmlVariable += '<div class="input-group-append"><span class="input-group-text task-everyx-addon-js" id="task-' + task.id + '-everyx-addon">' + frequencyPlurals[task.frequency] + '</span></div>';
        modalHtmlVariable += '</div></div>';
    }

    // Repeat on (days of week; dailies only)
    if (task.type === 'daily') {
        modalHtmlVariable += '<div class="task-param-variable-js d-none"><div class="form-group task-param-repeat-js ' + (task.frequency === 'weekly' ? '' : 'd-none') + '">';
        modalHtmlVariable += '<label>Repeat on</label><div>';
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
            modalHtmlVariable += '<div class="form-check form-check-inline"><input class="form-check-input" type="checkbox" id="' + inputId + '" value="true"' + (task.repeat[property] === true ? ' checked' : '') + '><label class="form-check-label" for="' + inputId + '">' + weekdayNames[property] + '</label></div>';
        }
        modalHtmlVariable += '</div></div></div>';
    }

    // Repeat on (day of month/week of month; dailies only)
    if (task.type === 'daily') {
        modalHtmlVariable += '<div class="task-param-variable-js d-none"><div class="form-group task-param-daysweeksofmonth-js ' + (task.frequency === 'monthly' ? '' : 'd-none') + '">';
        modalHtmlVariable += '<label>Repeat on</label><div>';
        modalHtmlVariable += '<div class="form-check form-check-inline"><input class="form-check-input" type="radio" name="task-dayofweekmonth" id="task-' + task.id + '-dayofmonth" value="true"' + (task.daysOfMonth && task.daysOfMonth.length > 0 ? ' checked' : '') + '><label class="form-check-label" for="task-' + task.id + '-dayofmonth">This day of the month</label></div>';
        modalHtmlVariable += '<div class="form-check form-check-inline"><input class="form-check-input" type="radio" name="task-dayofweekmonth" id="task-' + task.id + '-weekofmonth" value="true"' + (task.weeksOfMonth && task.weeksOfMonth.length > 0 ? ' checked' : '') + '><label class="form-check-label" for="task-' + task.id + '-weekofmonth">This week of the month</label></div>';
        modalHtmlVariable += '</div></div></div>';
    }

    // Tags
    if (Object.keys(userTagNames).length > 0) {
        if (task.tags != null && task.tags.length > 0) {
            modalHtmlStatic += '<tr class="task-param-static-js"><th>Tags</th><td>';
            task.tags.forEach(function (value) {
                modalHtmlStatic += '<span class="badge badge-pill badge-primary">' + userTagNames[value] + '</span> ';
            });
            modalHtmlStatic += '</td></tr>';
        }
        modalHtmlVariable += '<div class="form-group task-param-variable-js d-none"><label>Tags</label><div class="row">';
        Object.keys(userTagNames).forEach(function (key) {
            modalHtmlVariable += '<div class="col-xs-12 col-sm-6"><div class="form-check">';
            modalHtmlVariable += '<input class="form-check-input task-tag-js" type="checkbox" id="task-' + task.id + '-tag-' + key + '" value="' + key + '"' + (taskHasTag(task, key) ? ' checked' : '') + '>';
            modalHtmlVariable += '<label class="form-check-label" for="task-' + task.id + '-tag-' + key + '">' + userTagNames[key] + '</label>';
            modalHtmlVariable += '</div></div>';
        });
        modalHtmlVariable += '</div></div>';
    }


    modalHtmlStatic += '</tbody></table>';


    // Footer
    modalHtmlFooter += '<hr><div class="btn-group btn-group-sm float-right btn-group-task1-js" role="group" aria-label="Task Actions">';
    modalHtmlFooter += '<button type="button" class="btn btn-success btn-task-complete-js" onclick="completeTask($(this));" data-taskid="' + task.id + '" data-tasktitle="' + taskTitleNoQuotes + '"><i class="fas fa-check"></i> Complete</button>';
    modalHtmlFooter += '<button type="button" class="btn btn-primary btn-task-edit-js" onclick="editTask();" data-taskid="' + task.id + '" data-tasktitle="' + taskTitleNoQuotes + '"><i class="fas fa-pencil-alt"></i> Edit</button>';
    modalHtmlFooter += '<button type="button" class="btn btn-danger btn-task-delete-js" onclick="deleteTask($(this));" data-taskid="' + task.id + '" data-tasktitle="' + taskTitleNoQuotes + '"><i class="fas fa-trash"></i> Delete</button>';
    modalHtmlFooter += '</div>';

    modalHtmlFooter += '<div class="btn-group btn-group-sm float-right btn-group-task2-js d-none" role="group" aria-label="Task Editing Actions">';
    modalHtmlFooter += '<button type="button" class="btn btn-success btn-task-save-js" onclick="saveTask($(this), ' + isNewTask + ');" data-taskid="' + task.id + '"><i class="fas fa-save"></i> Save</button>';
    if (!isNewTask) {
        modalHtmlFooter += '<button type="button" class="btn btn-danger btn-task-edit-cancel-js" onclick="cancelEditTask();" data-taskid="' + task.id + '" data-tasktitle="' + taskTitleNoQuotes + '"><i class="fas fa-times"></i> Cancel</button>';
    }
    modalHtmlFooter += '</div>';

    return modalHtmlHeader + '<div class="modal-body">' + modalHtmlStatic + modalHtmlVariable + modalHtmlFooter + '</div>';
}

/**
 * Gathers info about a given task's frequency, including:
 * 1.   Whether it repeats daily, weekly, etc.
 * 2.   Which days of the week it repeats on, if applicable
 * 3.   Which days of the month it repeats on, if applicable (e.g. the 5th, the
 *      12th, etc.)
 * 4.   Which weeks of the month it repeats on, if applicable. Note that
 *      Habitica seems to think that days 1-7 of the month are always the first
 *      week, and days 8-14 are always the second week, and so on. It's the
 *      wrong way of determining the week number but I don't set tasks to
 *      repeat based on the week of the month, so I personally don't care.
 * It takes all this into account and outputs the frequency in a summed-up way,
 * e.g. "Every other month", "Every Tuesday", "Every month on the 15th", etc.
 * It uses {@link getNumberOrdinal} to do some of this.
 * @param {Object} task 
 * @returns {string} The task frequency, summed up
 */
function getTaskFrequencyHtml(task) {
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
            var taskStartMonth = monthNames[taskStartDate.getMonth()][0];
            var taskStartDay = taskStartDate.getDate();
    
            frequencyHtml += 'Every ' + frequencyName + ' on ' + taskStartMonth + ' ' + taskStartDay + getNumberOrdinal(taskStartDay);
        }
        else {
            if (task.everyX != null) {
                if (task.everyX > 2) {
                    var plural = 's';
                    var everyXString = task.everyX.toString();
                    var numberOrdinal = '';
    
                    if (task.frequency === 'weekly' && frequencyName !== 'week') {
                        plural = '';
                        numberOrdinal = getNumberOrdinal(task.everyX);
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
                    daysOfMonthWithOrdinal.push('the ' + value + getNumberOrdinal(value));
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
                    weeksOfMonthWithOrdinal.push('the ' + week + getNumberOrdinal(week));
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
 * Check if a given task has a certain task indicating its duration, and
 * returns that duration as a number of minutes. Tags intended for use as task
 * durations must end in the format "##:##" or "#:##" for this to work. If a
 * task doesn't have a duration tag, or if it has more than one duration tag,
 * or if a number can't be determined from the tag, 0 is returned. 
 * @param {*} task - The task to check
 * @param {*} tagId - The tag ID to look for
 * @returns {boolean} true if the tag is found
 */
function getTaskDuration(task) {
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

function formatTaskDuration(duration) {
    var durationFormatted = '';

    if (duration >= 60) {
        var durationInHours = duration / 60;

        durationFormatted = (durationInHours % 1 === 0 ? durationInHours : durationInHours.toFixed(1)) + 'h';
    }
    else {
        durationFormatted = duration + 'm';
    }

    return durationFormatted;
}


/**
 * Gets the ordinal of a given number, e.g. the ordinal for 1 is "st", the
 * ordinal for 12 is "th", etc.
 * @param {number} number 
 * @returns {string} The ordinal
 */
function getNumberOrdinal(number) {
    var numberAsString = number.toString();
    var ordinal = '';

    if (numberAsString.endsWith('11') || numberAsString.endsWith('12') || numberAsString.endsWith('13')) {
        ordinal = 'th';
    }
    else if (numberAsString.endsWith('1')) {
        ordinal = 'st';
    }
    else if (numberAsString.endsWith('2')) {
        ordinal = 'nd';
    }
    else if (numberAsString.endsWith('3')) {
        ordinal = 'rd';
    }
    else {
        ordinal = 'th';
    }

    return ordinal;
}


function updateHeaderSpacing() {
    let headerHeight = $('.header-js').outerHeight(true);

    $('body').css('padding-top', headerHeight);
    $('.toasts-js').css('top', headerHeight);
}


/**
 * Because stuff in here doesn't seem to work unless you call them after the
 * DOM is updated. And no, putting these in $(window).load() doesn't work.
 */
function startTaskInteractiveness() {
    $('.badge-task-js').on('click', function (e) {
        var taskId = $(this).data('taskid');
        var taskDescription = $('#task-' + taskId + '-modal').html();
        $('#modal-task').find('.modal-content').html(taskDescription);
        $('#modal-task').modal('show');
    });

    updateHeaderSpacing();
}

$('body').popover({
    selector: '.badge-task-js',
    html: true, 
    trigger: 'hover',
    placement: 'auto',
    content: function() { 
        return $('#task-' + $(this).data('taskid') + '-tooltip').html()
    }
});

$('body').tooltip({
    selector: '[data-toggle="tooltip"]'
});

$('#strategitica-add-daily').on('click', function (e) {
    var taskId = 'new';
    var taskDescription = $('#task-' + taskId + '-modal').html();
    $('#modal-task').find('.modal-content').html(taskDescription);
    editTask();
    $('#modal-task').modal('show');
});


// On non-touch devices, popovers appear when hovering over a task, and the
// modal appears when clicking a task. On touch devices, both appear when
// touching a task. We only want the modal to appear on touch devices, but
// detecting touch isn't foolproof. So instead, we just want to make sure all
// popovers are closed when the modal opens. So...

$('#modal-task').on('show.bs.modal', function (e) {
    $(this).find('[id]').each(function() {
        var itemId = $(this).attr('id');
        $(this).attr('id', itemId + '-modal');
    });

    $(this).find('[for]').each(function() {
        var itemFor = $(this).attr('for');
        $(this).attr('for', itemFor + '-modal');
    });

    $(this).attr('aria-labelledby', $(this).find('.modal-header .modal-title').first().attr('id'));

    $('.badge-task-js').popover('hide');
});


$(document).ready(function () {
    updateHeaderSpacing();
});

// debulked onresize handler
function on_resize(c,t){onresize=function(){clearTimeout(t);t=setTimeout(c,100)};return c};

on_resize(function () {
    updateHeaderSpacing();
});

$(document).on('change', '.task-checklist-item-js', function () {
    scoreChecklistItem($(this));
});

$(document).on('change', '.task-checklist-item-js', function () {
    scoreChecklistItem($(this));
});

$(document).on('change', '#modal-task [name="task-frequency"]', function() {
    var taskRepeatContainer = $('#modal-task .task-param-repeat-js');
    var taskDaysWeeksOfMonthContainer = $('#modal-task .task-param-daysweeksofmonth-js');
    var taskEveryXAddon = $('#modal-task .task-everyx-addon-js');

    if ($(this).val() === 'weekly') {
        taskRepeatContainer.removeClass('d-none');
    }
    else {
        taskRepeatContainer.addClass('d-none');
    }

    if ($(this).val() === 'monthly') {
        taskDaysWeeksOfMonthContainer.removeClass('d-none');

        if ($('#modal-task [name="task-dayofweekmonth"]:checked').length === 0) {
            $('#modal-task [name="task-dayofweekmonth"]').first().prop('checked', true);
        }
    }
    else {
        taskDaysWeeksOfMonthContainer.addClass('d-none');

        $('#modal-task [name="task-dayofweekmonth"]').prop('checked', false);
    }

    taskEveryXAddon.html(frequencyPlurals[$(this).val()]);
});

$(document).on('change', '#modal-task [name="task-everyx"]', function() {
    var everyXValue = $(this).val();

    if (parseInt(everyXValue) <= 0 || Number.isNaN(parseInt(everyXValue))) {
        $(this).val(1);
    }

    if (everyXValue % 1 != 0) {
        $(this).val(Math.floor(everyXValue));
    }
});