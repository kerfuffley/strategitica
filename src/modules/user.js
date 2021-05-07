import * as Utils from './utils.js';
import $ from 'jquery';

export class User {
    /**
     * 
     * @param {string} id - The user ID
     * @param {string} token - The user's API token
     */
    constructor(id, token) {
        this.id = id;
        this.token = token;
        this.tags = {};
        this.tasks = {};
        this.name = '';
        this.displayName = '';
        this.class = '';
        this.level = 0;
        this.hp = 0;
        this.hpMax = 0;
        this.exp = 0;
        this.expToNextLevel = 0;
        this.mp = 0;
        this.mpMax = 0;
        this.isSleeping = false;
        this.dayStart = 0;
    }

    /**
     * @see {@link https://habitica.com/apidoc/#api-Tag-GetTag|Tag - Get a tag}
     * @see {@link https://habitica.com/apidoc/#api-Task-GetUserTasks|Task - Get a user's tasks}
     * @see {@link https://habitica.com/apidoc/#api-User-UserGet|User - Get the authenticated user's profile}
     */
    create(onComplete) {
        var user = this;

        try {
            $.when(this.getTags(), this.getDailies(), this.getTodos(), this.getUserInfo()).then(function (tags, dailies, todos, userInfo) {
                Utils.updateLogs('Data loaded successfully!');

                let userTagNames = {};

                if (tags[0].data !== null) {
                    tags[0].data.forEach(function (value) {
                        userTagNames[value.id.toString()] = value.name;
                    });
                }

                user.tags = userTagNames;

                var allTasks = {};

                [].concat(dailies[0].data, todos[0].data).forEach(function (item, index, myArray) {
                    allTasks[item.id] = item;
                });

                user.tasks = allTasks;

                if (userInfo[0].data !== null) {
                    if ('auth' in userInfo[0].data) {
                        if ('local' in userInfo[0].data.auth) {
                            if ('username' in userInfo[0].data.auth.local) {
                                user.name = userInfo[0].data.auth.local.username;
                            }
                        }
                    }

                    if ('profile' in userInfo[0].data) {
                        if ('name' in userInfo[0].data.profile) {
                            user.displayName = userInfo[0].data.profile.name;
                        }
                    }
                    
                    if ('stats' in userInfo[0].data) {
                        if ('class' in userInfo[0].data.stats) {
                            user.class = userInfo[0].data.stats.class.toLowerCase() === 'wizard' ? 'Mage' : userInfo[0].data.stats.class.charAt(0).toUpperCase() + userInfo[0].data.stats.class.slice(1);
                        }
                        if ('lvl' in userInfo[0].data.stats) {
                            user.level = userInfo[0].data.stats.lvl;
                        }
                        if ('hp' in userInfo[0].data.stats) {
                            user.hp = userInfo[0].data.stats.hp;
                        }
                        if ('maxHealth' in userInfo[0].data.stats) {
                            user.hpMax = Math.floor(userInfo[0].data.stats.maxHealth);
                        }
                        if ('exp' in userInfo[0].data.stats) {
                            user.exp = Math.floor(userInfo[0].data.stats.exp);
                        }
                        if ('toNextLevel' in userInfo[0].data.stats) {
                            user.expToNextLevel = userInfo[0].data.stats.toNextLevel;
                        }
                        if ('mp' in userInfo[0].data.stats) {
                            user.mp = Math.floor(userInfo[0].data.stats.mp);
                        }
                        if ('maxMP' in userInfo[0].data.stats) {
                            user.mpMax = userInfo[0].data.stats.maxMP;
                        }
                    }

                    if ('preferences' in userInfo[0].data) {
                        if ('sleep' in userInfo[0].data.preferences) {
                            user.isSleeping = userInfo[0].data.preferences.sleep;
                        }
                        if ('dayStart' in userInfo[0].data.preferences) {
                            user.dayStart = userInfo[0].data.preferences.dayStart;
                        }
                    }

                    var message = `User info loaded successfully. Here's some info about you:<br>
                         Username: @${user.name}<br>
                         Display Name: ${user.displayName}<br>
                         Class: ${user.class}<br>
                         Level: ${user.level}<br>
                         HP: ${user.hp} / ${user.hpMax}<br>
                         Experience: ${user.exp} / ${user.expToNextLevel}<br>
                         MP: ${user.mp} / ${user.mpMax}<br>
                         Resting in the tavern: ${user.isSleeping}<br>
                         Day start: ${user.dayStart}<br>
                         Tags: ${Object.values(user.tags)}`;
                    Utils.updateLogs(message);
                }

                if (onComplete) {
                    onComplete();
                }
            }, function (error) {
                $('#strategitica-login-progress').addClass('d-none');

                var message = 'Couldn\'t get data';
                if ('status' in error) {
                    message += ': ' + error.status + ' Error';
                    if ('responseJSON' in error) {
                        if ('message' in error.responseJSON) {
                            message += ' - ' + error.responseJSON.message;
                        }
                    }
                }

                Utils.updateLogs(message, true);
            });
        }
        catch (error) {
            Utils.updateLogs('Couldn\'t get data: ' + error.responseText, true);
        }
    }

    getTags(onComplete) {
        var user = this;
        var options = {
            async: true,
            url: 'https://habitica.com/api/v3/tags',
            type: 'GET',
            dataType: 'json',
            contentType: 'application/json',
            cache: false,
            beforeSend: function (xhr) {
                xhr.setRequestHeader('x-client', Utils.appClient);
                xhr.setRequestHeader('x-api-user', user.id);
                xhr.setRequestHeader('x-api-key', user.token);
            }
        };

        if (onComplete) {
            try {
                $.ajax(options)
                .done(function (data) {
                    let userTagNames = {};

                    if (data.data !== null) {
                        data.data.forEach(function (value) {
                            userTagNames[value.id.toString()] = value.name;
                        });
                    }
    
                    user.tags = userTagNames;

                    Utils.updateLogs('Tags loaded successfully');

                    onComplete();
                })
                .fail(function (jqXHR, textStatus, errorThrown) {
                    var message = 'Couldn\'t get user\'s tasks';
                    if ('status' in jqXHR) {
                        message += ': ' + error.status + ' Error';
                        if ('responseJSON' in error) {
                            if ('message' in error.responseJSON) {
                                message += ' - ' + error.responseJSON.message;
                            }
                        }
                    }
    
                    Utils.updateLogs(message, true);
                })
            }
            catch (error) {
                Utils.updateLogs('Couldn\'t get user\'s tasks: ' + error.responseText, true);
            }
        }
        else {
            return $.ajax(options);
        }
    }

    getTasks(onComplete) {
        var user = this;

        try {
            $.when(this.getDailies(), this.getTodos()).then(function (dailies, todos) {
                var allTasks = {};
    
                [].concat(dailies[0].data, todos[0].data).forEach(function (item, index, myArray) {
                    allTasks[item.id] = item;
                });
    
                user.tasks = allTasks;

                Utils.updateLogs('Tasks loaded successfully');

                if(onComplete) {
                    onComplete();
                }
            }, function (error) {
                var message = 'Couldn\'t get tasks';
                if ('status' in error) {
                    message += ': ' + error.status + ' Error';
                    if ('responseJSON' in error) {
                        if ('message' in error.responseJSON) {
                            message += ' - ' + error.responseJSON.message;
                        }
                    }
                }
    
                Utils.updateLogs(message, true);
            });
        }
        catch (error) {
            Utils.updateLogs('Couldn\'t get tasks: ' + error.responseText, true);
        }
    }

    getDailies() {
        var userId = this.id;
        var apiToken = this.token;
        
        return $.ajax({
            async: true,
            url: 'https://habitica.com/api/v3/tasks/user',
            type: 'GET',
            dataType: 'json',
            contentType: 'application/json',
            cache: false,
            data: {
                type: 'dailys'
            },
            beforeSend: function (xhr) {
                xhr.setRequestHeader('x-client', Utils.appClient);
                xhr.setRequestHeader('x-api-user', userId);
                xhr.setRequestHeader('x-api-key', apiToken);
            }
        });
    }

    getTodos() {
        var userId = this.id;
        var apiToken = this.token;

        return $.ajax({
            async: true,
            url: 'https://habitica.com/api/v3/tasks/user',
            type: 'GET',
            dataType: 'json',
            contentType: 'application/json',
            cache: false,
            data: {
                type: 'todos'
            },
            beforeSend: function (xhr) {
                xhr.setRequestHeader('x-client', Utils.appClient);
                xhr.setRequestHeader('x-api-user', userId);
                xhr.setRequestHeader('x-api-key', apiToken);
            }
        });
    }

    getUserInfo(onComplete) {
        var user = this;
        var options = {
            async: true,
            url: 'https://habitica.com/api/v3/user',
            type: 'GET',
            dataType: 'json',
            contentType: 'application/json',
            cache: false,
            beforeSend: function (xhr) {
                xhr.setRequestHeader('x-client', Utils.appClient);
                xhr.setRequestHeader('x-api-user', user.id);
                xhr.setRequestHeader('x-api-key', user.token);
            }
        };

        if (onComplete) {
            try {
                $.ajax(options)
                .done(function (data) {
                    if (data.data !== null) {
                        if ('auth' in data.data) {
                            if ('local' in data.data.auth) {
                                if ('username' in data.data.auth.local) {
                                    user.name = data.data.auth.local.username;
                                }
                            }
                        }
    
                        if ('profile' in data.data) {
                            if ('name' in data.data.profile) {
                                user.displayName = data.data.profile.name;
                            }
                        }
                        
                        if ('stats' in data.data) {
                            if ('class' in data.data.stats) {
                                user.class = data.data.stats.class.toLowerCase() === 'wizard' ? 'Mage' : data.data.stats.class.charAt(0).toUpperCase() + data.data.stats.class.slice(1);
                            }
                            if ('lvl' in data.data.stats) {
                                user.level = data.data.stats.lvl;
                            }
                            if ('hp' in data.data.stats) {
                                user.hp = data.data.stats.hp;
                            }
                            if ('maxHealth' in data.data.stats) {
                                user.hpMax = Math.floor(data.data.stats.maxHealth);
                            }
                            if ('exp' in data.data.stats) {
                                user.exp = Math.floor(data.data.stats.exp);
                            }
                            if ('toNextLevel' in data.data.stats) {
                                user.expToNextLevel = data.data.stats.toNextLevel;
                            }
                            if ('mp' in data.data.stats) {
                                user.mp = Math.floor(data.data.stats.mp);
                            }
                            if ('maxMP' in data.data.stats) {
                                user.mpMax = data.data.stats.maxMP;
                            }
                        }
    
                        if ('preferences' in data.data) {
                            if ('sleep' in data.data.preferences) {
                                user.isSleeping = data.data.preferences.sleep;
                            }
                            if ('dayStart' in data.data.preferences) {
                                user.dayStart = data.data.preferences.dayStart;
                            }
                        }
    
                        var message = `User info loaded successfully. Here's some info about you:<br>
                             Username: @${user.name}<br>
                             Display Name: ${user.displayName}<br>
                             Class: ${user.class}<br>
                             Level: ${user.level}<br>
                             HP: ${user.hp} / ${user.hpMax}<br>
                             Experience: ${user.exp} / ${user.expToNextLevel}<br>
                             MP: ${user.mp} / ${user.mpMax}<br>
                             Resting in the tavern: ${user.isSleeping}<br>
                             Day start: ${user.dayStart}<br>
                             Tags: ${Object.values(user.tags)}`;
                        Utils.updateLogs(message);
                    }

                    onComplete();
                })
                .fail(function (jqXHR, textStatus, errorThrown) {
                    var message = 'Couldn\'t get user info';
                    if ('status' in jqXHR) {
                        message += ': ' + error.status + ' Error';
                        if ('responseJSON' in error) {
                            if ('message' in error.responseJSON) {
                                message += ' - ' + error.responseJSON.message;
                            }
                        }
                    }
    
                    Utils.updateLogs(message, true);
                })
            }
            catch (error) {
                Utils.updateLogs('Couldn\'t get user info: ' + error.responseText, true);
            }
        }
        else {
            return $.ajax(options);
        }
    }

    /**
     * Changes the user's tavern status to the opposite of whatever it
     * currently is.
     * 
     * @see {@link https://habitica.com/apidoc/#api-User-UserSleep|User - Make the user start / stop sleeping (resting in the Inn)}
     */
    changeTavernStatus(onComplete) {
        var user = this;

        try {
            $.ajax({
                async: true,
                url: 'https://habitica.com/api/v3/user/sleep',
                type: 'POST',
                data: !user.isSleeping,
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
                    user.isSleeping = data.data;

                    var message = 'You have successfully ' + (user.isSleeping === true ? 'entered' : 'left') + ' the tavern.';
                    Utils.updateLogs(message);
                    Utils.updateToast('success', 'Tavern Status', message);

                    if (onComplete) {
                        onComplete();
                    }
                })
                .fail(function (jqXHR, textStatus, errorThrown) {
                    let message = 'Couldn\'t update tavern status: <br>' + jqXHR.status + ' Error';

                    if ('responseJSON' in jqXHR) {
                        if ('message' in jqXHR.responseJSON) {
                            message += ' - ' + jqXHR.responseJSON.message;
                        }
                    }

                    Utils.updateLogs('Error: ' + message, true);
                    Utils.updateToast('error', 'Error', message);
                });
        }
        catch (error) {
            $('#strategitica-tavern-change1').hide();

            var message = 'Couldn\'t update tavern status: <br>' + error.responseText;
            Utils.updateLogs('Error: ' + message, true);
            Utils.updateToast('error', 'Error', message);
        }
    }
}