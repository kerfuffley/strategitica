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
        this.tags = null;
        this.tasks = null;
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
            $.when(this.getTags(), this.getTasks(), this.getUserInfo()).then(function (tags, tasks, userInfo) {
                Utils.updateLogs('Data loaded successfully!');

                let userTagNames = {};

                if (tags[0].data !== null) {
                    tags[0].data.forEach(function (value) {
                        userTagNames[value.id.toString()] = value.name;
                    });
                }

                user.tags = userTagNames;

                user.tasks = tasks[0].data;

                if (userInfo[0].data !== null) {
                    user.name = userInfo[0].data.auth.local.username;
                    user.displayName = userInfo[0].data.profile.name;
                    user.class = userInfo[0].data.stats.class.toLowerCase() === 'wizard' ? 'Mage' : userInfo[0].data.stats.class.charAt(0).toUpperCase() + userInfo[0].data.stats.class.slice(1);
                    user.level = userInfo[0].data.stats.lvl;
                    user.hp = userInfo[0].data.stats.hp;
                    user.hpMax = Math.floor(userInfo[0].data.stats.maxHealth);
                    user.exp = Math.floor(userInfo[0].data.stats.exp);
                    user.expToNextLevel = userInfo[0].data.stats.toNextLevel;
                    user.mp = Math.floor(userInfo[0].data.stats.mp);
                    user.mpMax = userInfo[0].data.stats.maxMP;
                    user.isSleeping = userInfo[0].data.preferences.sleep;
                    user.dayStart = userInfo[0].data.preferences.dayStart;

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
            var message = 'Couldn\'t get data: ' + error.responseText;
            Utils.updateLogs(message, true);
        }
    }

    getTags() {
        var userId = this.id;
        var apiToken = this.token;

        return $.ajax({
            async: true,
            url: 'https://habitica.com/api/v3/tags',
            type: 'GET',
            dataType: 'json',
            contentType: 'application/json',
            cache: false,
            beforeSend: function (xhr) {
                xhr.setRequestHeader('x-client', Utils.appClient);
                xhr.setRequestHeader('x-api-user', userId);
                xhr.setRequestHeader('x-api-key', apiToken);
            }
        });
    }

    getTasks() {
        var userId = this.id;
        var apiToken = this.token;

        return $.ajax({
            async: true,
            url: 'https://habitica.com/api/v3/tasks/user',
            type: 'GET',
            dataType: 'json',
            contentType: 'application/json',
            cache: false,
            beforeSend: function (xhr) {
                xhr.setRequestHeader('x-client', Utils.appClient);
                xhr.setRequestHeader('x-api-user', userId);
                xhr.setRequestHeader('x-api-key', apiToken);
            }
        });
    }

    getUserInfo() {
        var userId = this.id;
        var apiToken = this.token;

        return $.ajax({
            async: true,
            url: 'https://habitica.com/api/v3/user',
            type: 'GET',
            dataType: 'json',
            contentType: 'application/json',
            cache: false,
            beforeSend: function (xhr) {
                xhr.setRequestHeader('x-client', Utils.appClient);
                xhr.setRequestHeader('x-api-user', userId);
                xhr.setRequestHeader('x-api-key', apiToken);
            }
        });
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