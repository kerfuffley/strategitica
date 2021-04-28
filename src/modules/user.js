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
    create() {
        var userId = this.id;
        var apiToken = this.token;

        let userTags = null;
        userTags = function () {
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
                        xhr.setRequestHeader('x-client', Utils.appClient);
                        xhr.setRequestHeader('x-api-user', userId);
                        xhr.setRequestHeader('x-api-key', apiToken);
                    }
                })
                    .done(function (data) {
                        tags = data.data;
                        Utils.updateLogs('Tags loaded successfully');
                    })
                    .fail(function (jqXHR, textStatus, errorThrown) {
                        var message = 'Couldn\'t get user\'s tags: \n' + jqXHR.status + ' Error';

                        if ('responseJSON' in jqXHR) {
                            if ('message' in jqXHR.responseJSON) {
                                message += ' - ' + jqXHR.responseJSON.message;
                            }
                        }

                        Utils.updateLogs(message, true);
                    });
            }
            catch (error) {
                var message = 'Couldn\'t get user\'s tags: ' + error.responseText;
                Utils.updateLogs(message, true);
            }

            return tags;
        }();

        let userTagNames = {};

        if (userTags !== null) {
            userTags.forEach(function (value) {
                userTagNames[value.id.toString()] = value.name;
            });
        }

        this.tags = userTagNames;

        let userTasks = null;
        userTasks = function () {
            var tasks = null;
            try {
                $.ajax({
                    async: false,
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
                })
                    .done(function (data) {
                        tasks = data.data;
                        Utils.updateLogs('Tasks loaded successfully');
                    })
                    .fail(function (jqXHR, textStatus, errorThrown) {
                        let message = 'Couldn\'t get user\'s tasks: <br>' + jqXHR.status + ' Error';

                        if ('responseJSON' in jqXHR) {
                            if ('message' in jqXHR.responseJSON) {
                                message += ' - ' + jqXHR.responseJSON.message;
                            }
                        }

                        Utils.updateLogs(message, true);
                    });
            }
            catch (error) {
                var message = 'Couldn\'t get user\'s tasks: <br>' + error.responseText;
                Utils.updateLogs(message, true);
            }

            return tasks;
        }();

        this.tasks = userTasks;

        let userInfo = null;
        userInfo = function () {
            var info = null;
            try {
                $.ajax({
                    async: false,
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
                })
                    .done(function (data) {
                        info = data.data;

                        var message = `User info loaded successfully. Here's some info about you:<br>
                        Name: @${info.auth.local.username}<br>
                        Display Name: ${info.profile.name}<br>
                        Class: ${info.stats.class.toLowerCase() === 'wizard' ? 'Mage' : info.stats.class.charAt(0).toUpperCase() + info.stats.class.slice(1)}<br>
                        Level: ${info.stats.lvl}<br>
                        HP: ${info.stats.hp} / ${Math.floor(info.stats.maxHealth)}<br>
                        Experience: ${Math.floor(info.stats.exp)} / ${info.stats.toNextLevel}<br>
                        MP: ${Math.floor(info.stats.mp)} / ${info.stats.maxMP}<br>
                        Resting in the tavern: ${info.preferences.sleep}<br>
                        Day start: ${info.preferences.dayStart}`;
                        Utils.updateLogs(message);
                    })
                    .fail(function (jqXHR, textStatus, errorThrown) {
                        var message = 'Couldn\'t load user info: <br>' + jqXHR.status + ' Error';

                        if ('responseJSON' in jqXHR) {
                            if ('message' in jqXHR.responseJSON) {
                                message += ' - ' + jqXHR.responseJSON.message;
                            }
                        }

                        Utils.updateLogs('Error: ' + message, true);
                    });
            }
            catch (error) {
                Utils.updateLogs(error.resposeText, true);
            }

            return info;
        }();

        if (userInfo !== null) {
            this.name = userInfo.auth.local.username;
            this.displayName = userInfo.profile.name;
            this.class = userInfo.stats.class.toLowerCase() === 'wizard' ? 'Mage' : userInfo.stats.class.charAt(0).toUpperCase() + userInfo.stats.class.slice(1);
            this.level = userInfo.stats.lvl;
            this.hp = userInfo.stats.hp;
            this.hpMax = Math.floor(userInfo.stats.maxHealth);
            this.exp = Math.floor(userInfo.stats.exp);
            this.expToNextLevel = userInfo.stats.toNextLevel;
            this.mp = Math.floor(userInfo.stats.mp);
            this.mpMax = userInfo.stats.maxMP;
            this.isSleeping = userInfo.preferences.sleep;
            this.dayStart = userInfo.preferences.dayStart;
        }
    }

    /**
     * Changes the user's tavern status to the opposite of whatever it
     * currently is.
     * 
     * @see {@link https://habitica.com/apidoc/#api-User-UserSleep|User - Make the user start / stop sleeping (resting in the Inn)}
     */
    changeTavernStatus() {
        var userId = this.id;
        var apiToken = this.token;
        var isSleeping = this.isSleeping;

        try {
            $.ajax({
                async: false,
                url: 'https://habitica.com/api/v3/user/sleep',
                type: 'POST',
                data: !isSleeping,
                dataType: 'json',
                contentType: 'application/json',
                cache: false,
                beforeSend: function (xhr) {
                    xhr.setRequestHeader('x-client', Utils.appClient);
                    xhr.setRequestHeader('x-api-user', userId);
                    xhr.setRequestHeader('x-api-key', apiToken);
                }
            })
                .done(function (data) {
                    isSleeping = data.data;

                    var message = 'You have successfully ' + (isSleeping === true ? 'entered' : 'left') + ' the tavern.';
                    Utils.updateLogs(message);
                    Utils.updateToast('success', 'Tavern Status', message);
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

        this.isSleeping = isSleeping;
    }
}