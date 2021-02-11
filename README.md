# <img align="left" height="50" src="https://raw.githubusercontent.com/iymeko/strategitica/main/img/logo.png"> Strategitica

## A calendar view for [Habitica](https://habitica.com/).

> Welcome to Strategitica, a land conquered by a Habitican warrior during a time of great struggle in the Tasks War. After months of fighting a losing battle, the warrior realized that the only way to win was to somehow anticipate the enemy's movements. After much questing, the warrior found sacred tomes detailing how to harness the power of the legendary Habitican API. With this newfound power, the warrior commanded the API to foretell the enemy's movements. Using a fabled tactic known as a "calendar", the warrior organized this information so that each day's onslaught for the coming weeks could be examined in great detail. In no time at all, the warrior vanquished the evil tasks and colonized the territory the tasks abandoned. As the land was founded on the now revered principles of Information and Organization, the warrior dubbed this new land Strategitica.

## How to Use

Just go to https://iymeko.github.io/strategitica/ and enter your Habitica user ID and API token. Both can be found at https://habitica.com/user/settings/api. You may also go to https://iymeko.github.io/strategitica/?id=[YOUR-HABITICA-USER-ID] to pre-fill your user ID, if this saves time for you.

**Note:** Once your ID/token are entered, if you think Strategitica might not be up-to-date (for example, maybe you left Strategitica's page alone for a day, or you made changes on habitica.com or the Habitica app after using Strategitica, etc.), **you can refresh your data by clicking Refresh in the menu**. This saves you from having to refresh the page and re-enter your ID/token every time you want up-to-date info. The page does data refreshes itself immediately after you make changes using Strategitica, but it can't detect changes made outside of Strategitica.

## Optional Features

### Task Duration

Strategitica can show a task's duration to the right of the task. It can also show the total duration for all tasks in a day. To use this feature, create a tag for each task duration you want to use. Each tag should end with the following blurb:

> [strategitica|duration|##:##]

For example, if you add a tag named "[strategitica|duration|00:15]" (without quotes) to a task, Strategitica will recognize this as a 15-minute task. You can add whatever text you want before the blurb--it's only important that the blurb is at the very end. For example, "My tag name here [strategitica|duration|00:15]" will work just the same.

**Note:** As shown above, this only works for hh:mm format. For example, a tag for an hour should end with [strategitica|duration|01:00], not [strategitica|duration|1:00]. Something like [strategitica|duration|01:00:00] is also not supported.

**Another Note:** If a task has more than one duration tag, Strategitica won't recognize that the task has a duration. Use only one duration tag on a task.

### Task Time of Day

Similarly to task durations, you can add a blurb to the end of a tag to tell Strategitica that a task should be completed in the morning, afternoon or evening. Tasks will be grouped by time of day.

> [strategitica|morning]

> [strategitica|afternoon]

> [strategitica|evening]

As with task durations, you can add whatever text you want before the blurb.

**Note:** morning, afternoon and evening are the only supported times of day.

**Another Note:** If a task has more than one time of day tag, Strategitica won't recognize that the task has a time of day. Use only one time of day tag on a task.

### "One-Time Dailies" ###

Habitica users will probably know that there are dailies (recurring tasks) and to-do's (one-time tasks). Both have due dates, but as far as I can tell, there is no penalty for not completing a to-do on time like there is with dailies. If you're like me and you need that penalty as motivation to get your one-time tasks done, then "one-time dailies" might be for you. As with task duration tags and time of day tags, create a tag that ends with:

> [strategitica|1td]

Add this to a daily that's really just a one-time task, and Strategitica will know to only show that task on its due date, not on any of its recurring due dates.

## Notable Limitations/Issues

1. [Strategitica doesn't show to-do's, only dailies.](https://github.com/iymeko/strategitica/issues/19) This is pretty much my top priority to fix.
2. [Not all of your tasks' due dates are shown](https://github.com/iymeko/strategitica/issues/20) due to a limitation with Habitica's API. It has a list of future due dates for each of your tasks, but it doesn't go on forever. It only seems to remember the next ~6 or so due dates. I'm hoping I'll be able to come up with a solution for this.
3. [Strategitica doesn't run cron.](https://github.com/iymeko/strategitica/issues/12) I may implement this one day, but right now, if you start your day and cron hasn't run yet, you'll see yesterday's tasks as today's tasks in your calendar. So, use habitica.com or the Habitica app to run cron.
4. [You can't edit task checkboxes yet.](https://github.com/iymeko/strategitica/issues/8) You can check and uncheck existing checkboxes, you just can't create new ones or edit/remove existing ones. Sorry, I just haven't gotten around to this yet.
