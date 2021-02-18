import * as Utils from './utils.js';

/**
 * Uses the Habitica API to complete a task.
 * 
 * @param {string} taskId - The task ID
 * @param {string} taskTitle - The task's title
 * @param {User} user - The user the task belongs to
 * @see {@link https://habitica.com/apidoc/#api-Task-ScoreTask|Task - Score a task}
 */
export function complete(taskId, taskTitle, user) {
    try {
        $.ajax({
            url: 'https://habitica.com/api/v3/tasks/' + taskId + '/score/up',
            type: 'POST',
            dataType: 'json',
            contentType: 'application/json',
            cache: false,
            beforeSend: function (xhr) {
                xhr.setRequestHeader('x-client', Utils.appClient);
                xhr.setRequestHeader('x-api-user', user.id);
                xhr.setRequestHeader('x-api-key', user.token);
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
                $('#modal-task').modal('hide');

                Utils.updateToast('success', taskTitle, message);
            })
            .fail(function (jqXHR, textStatus, errorThrown) {
                let message = 'Couldn\'t complete ' + taskTitle + ': <br>' + jqXHR.status + ' Error';

                if ('responseJSON' in jqXHR) {
                    if ('message' in jqXHR.responseJSON) {
                        message += ' - ' + jqXHR.responseJSON.message;
                    }
                }

                Utils.updateToast('error', 'Error', message);
            });
    }
    catch (error) {
        $('#modal-task').modal('hide');
        Utils.updateToast('error', 'Error', 'Couldn\'t complete ' + taskTitle + ': <br>' + error.responseText);
    }
}

/**
 * Hides the non-editing parts of the task modal and shows the editing parts.
 */
export function edit() {
    $('#modal-task .btn-group-task1-js').addClass('d-none');
    $('#modal-task .btn-group-task2-js').removeClass('d-none');

    $('#modal-task .task-param-editable-js').removeClass('d-none');
    $('#modal-task .task-param-static-js').addClass('d-none');
}

/**
 * Basically, the opposite of {@link edit}.
 */
export function editCancel() {
    $('#modal-task .btn-group-task1-js').removeClass('d-none');
    $('#modal-task .btn-group-task2-js').addClass('d-none');

    $('#modal-task .task-param-editable-js').addClass('d-none');
    $('#modal-task .task-param-static-js').removeClass('d-none');
}

/**
 * Uses the Habitica API to delete a task.
 * 
 * @param {string} taskId - The task ID
 * @param {string} taskTitle - The task's title
 * @param {User} user - The user the task belongs to
 * @see {@link https://habitica.com/apidoc/#api-Task-DeleteTask|Task - Delete a task}
 */
export function remove(taskId, taskTitle, user) {
    if (confirm('Are you sure you want to delete this task?')) {
        try {
            $.ajax({
                url: 'https://habitica.com/api/v3/tasks/' + taskId,
                method: 'DELETE',
                dataType: 'json',
                contentType: 'application/json',
                beforeSend: function (xhr) {
                    xhr.setRequestHeader('x-client', Utils.appClient);
                    xhr.setRequestHeader('x-api-user', user.id);
                    xhr.setRequestHeader('x-api-key', user.token);
                }
            })
                .done(function (data) {
                    let message = 'Task deleted successfully.';

                    $('#modal-task .btn-task-delete-js').html('Deleted. Updating page...');
                    $('#modal-task').modal('hide');

                    Utils.updateToast('success', taskTitle, message);
                })
                .fail(function (jqXHR, textStatus, errorThrown) {
                    let message = 'Couldn\'t delete task: <br>' + jqXHR.status + ' Error';

                    if ('responseJSON' in jqXHR) {
                        if ('message' in jqXHR.responseJSON) {
                            message += ' - ' + jqXHR.responseJSON.message;
                        }
                    }

                    $('#modal-task').modal('hide');
                    Utils.updateToast('error', taskTitle, message);
                });
        }
        catch (error) {
            $('#modal-task').modal('hide');
            Utils.updateToast('error', taskTitle, 'Couldn\'t delete task: <br>' + error.responseText);
        }
    }
}

/**
 * Uses the Habitica API to update a task.
 * 
 * @param {Object} button - The button that called this function
 * @param {User} user - The user the task belongs to
 * @see {@link https://habitica.com/apidoc/#api-Task-UpdateTask|Task - Update a task}
 */
export function save(taskId, user) {
    var isNewTask = taskId === 'new';
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
        else if (taskType === 'todo'){
            var taskDate = new Date($('#task-' + taskId + '-date-modal').val() + 'T00:00:00');
            taskParameters['date'] = taskDate;
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
                    xhr.setRequestHeader('x-client', Utils.appClient);
                    xhr.setRequestHeader('x-api-user', user.id);
                    xhr.setRequestHeader('x-api-key', user.token);
                }
            })
            .done(function (data) {
                let message = 'Task successfully saved.';
    
                $('#modal-task .btn-task-edit-done-js').html('Saved! Updating page...');
                $('#modal-task').modal('hide');
    
                Utils.updateToast('success', taskText, message);
            })
            .fail(function (jqXHR, textStatus, errorThrown) {
                let message = 'Couldn\'t save ' + taskText + ': <br>' + jqXHR.status + ' Error';
    
                if ('responseJSON' in jqXHR) {
                    if ('message' in jqXHR.responseJSON) {
                        message += ' - ' + jqXHR.responseJSON.message;
                    }
                }
    
                Utils.updateToast('error', 'Error', message);
            });
        }
        catch (error) {
            $('#modal-task').modal('hide');
            Utils.updateToast('error', 'Error', 'Couldn\'t save ' + taskText + ': <br>' + error.responseText);
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
 * @param {User} user - The user the task belongs to
 * @see {@link https://habitica.com/apidoc/#api-Task-ScoreChecklistItem|Task - Score a checklist item}
 */
export function scoreChecklistItem(checkbox, user) {
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
                xhr.setRequestHeader('x-client', Utils.appClient);
                xhr.setRequestHeader('x-api-user', user.id);
                xhr.setRequestHeader('x-api-key', user.token);
            }
        })
        .done(function (data) {      
            // Cool, it worked! Let's be quiet about it though--it's just a
            // checkbox. Updating a tost for this is a tad annoying to the
            // user, I think.
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
            let message = 'Couldn\'t score checklist item: <br>' + jqXHR.status + ' Error';

            if ('responseJSON' in jqXHR) {
                if ('message' in jqXHR.responseJSON) {
                    message += ' - ' + jqXHR.responseJSON.message;
                }
            }

            Utils.updateToast('error', itemTitle, message);
        });
    }
    catch (error) {
        $('#modal-task').modal('hide');
        Utils.updateToast('error', itemTitle, 'Couldn\'t score checklist item: <br>' + error.responseText);
    }
}