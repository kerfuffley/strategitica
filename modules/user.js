import * as Utils from './utils.js';

class User {
    constructor(id, token, client) {
        this.id = id;
        this.token = token;
        this.client = client; // I know, the x-client isn't something belonging to a user, but I need to reference it, so...
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
    }

    /**
     * @see {@link https://habitica.com/apidoc/#api-User-UserGet|User - Get the authenticated user's profile}
     */
    create() {
        var userId = this.id;
        var apiToken = this.token;
        var client = this.client;

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
                        xhr.setRequestHeader('x-client', client);
                        xhr.setRequestHeader('x-api-user', userId);
                        xhr.setRequestHeader('x-api-key', apiToken);
                    }
                })
                    .done(function (data) {
                        tags = data.data;
                    })
                    .fail(function (jqXHR, textStatus, errorThrown) {
                        var message = 'Couldn\'t get user\'s tags: \n' + jqXHR.status + ' Error';

                        if ('responseJSON' in jqXHR) {
                            if ('message' in jqXHR.responseJSON) {
                                message += ' - ' + jqXHR.responseJSON.message;
                            }
                        }

                        console.log(message);
                    });
            }
            catch (error) {
                console.log('Couldn\'t get user\'s tags: ' + error.responseText);
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
                        xhr.setRequestHeader('x-client', client);
                        xhr.setRequestHeader('x-api-user', userId);
                        xhr.setRequestHeader('x-api-key', apiToken);
                    }
                })
                    .done(function (data) {
                        tasks = data.data;
                    })
                    .fail(function (jqXHR, textStatus, errorThrown) {
                        let message = 'Couldn\'t get user\'s tasks: <br>' + jqXHR.status + ' Error';

                        if ('responseJSON' in jqXHR) {
                            if ('message' in jqXHR.responseJSON) {
                                message += ' - ' + jqXHR.responseJSON.message;
                            }
                        }

                        $('#strategitica-calendar').html(message);
                    });
            }
            catch (error) {
                $('#strategitica-calendar').html('Couldn\'t get user\'s tasks: <br>' + error.responseText);
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
                        xhr.setRequestHeader('x-client', client);
                        xhr.setRequestHeader('x-api-user', userId);
                        xhr.setRequestHeader('x-api-key', apiToken);
                    }
                })
                    .done(function (data) {
                        info = data.data;
                    })
                    .fail(function (jqXHR, textStatus, errorThrown) {
                        var message = 'Couldn\'t load user info: <br>' + jqXHR.status + ' Error';

                        if ('responseJSON' in jqXHR) {
                            if ('message' in jqXHR.responseJSON) {
                                message += ' - ' + jqXHR.responseJSON.message;
                            }
                        }
            
                        $('#strategitica-stats').html(message);
                    });
            }
            catch (error) {
                $('#strategitica-stats').html(error.responseText);
            }

            return info;
        }();

        if (userInfo !== null) {
            this.name = userInfo.auth.local.username;
            this.displayName = userInfo.profile.name;
            this.class = userInfo.stats.class;
            this.level = userInfo.stats.lvl;
            this.hp = userInfo.stats.hp;
            this.hpMax = Math.floor(userInfo.stats.maxHealth);
            this.exp = Math.floor(userInfo.stats.exp);
            this.expToNextLevel = userInfo.stats.toNextLevel;
            this.mp = Math.floor(userInfo.stats.mp);
            this.mpMax = userInfo.stats.maxMP;
            this.isSleeping = userInfo.preferences.sleep;
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
        var client = this.client;
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
                    xhr.setRequestHeader('x-client', client);
                    xhr.setRequestHeader('x-api-user', userId);
                    xhr.setRequestHeader('x-api-key', apiToken);
                }
            })
                .done(function (data) {
                    isSleeping = data.data;
                    Utils.updateToast('success', 'Tavern Status', 'You have successfully ' + (isSleeping === true ? 'entered' : 'left') + ' the tavern.');
                })
                .fail(function (jqXHR, textStatus, errorThrown) {
                    let message = 'Couldn\'t update tavern status: <br>' + jqXHR.status + ' Error';
    
                    if ('responseJSON' in jqXHR) {
                        if ('message' in jqXHR.responseJSON) {
                            message += ' - ' + jqXHR.responseJSON.message;
                        }
                    }
    
                    Utils.updateToast('error', 'Error', message);
                });
        }
        catch (error) {
            $('#strategitica-tavern-change1').hide();
            Utils.updateToast('error', 'Error', 'Couldn\'t update tavern status: <br>' + error.responseText);
        }

        this.isSleeping = isSleeping;
    }
}

export { User };