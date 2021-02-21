[//]: # (Here's how to do semantic versioning:)
[//]: # (First Release                              1.0.0)
[//]: # (Backward compatible bug fix                1.0.1)
[//]: # (Backward compatible new feature            1.1.0)
[//]: # (Changes that break backward compatibility  2.0.0)

### [Strategitica](https://github.com/iymeko/strategitica) Changelog

## 1.2.0 (21 February, 2021)

* [#29](https://github.com/iymeko/strategitica/issues/29) resolved - emoji shortcodes are now supported

Changes above are in [pull request #34](https://github.com/iymeko/strategitica/pull/34).

## 1.1.0 (15 February, 2021)

* [#19](https://github.com/iymeko/strategitica/issues/19) resolved - To-do's now show in the calendar
* [#20](https://github.com/iymeko/strategitica/issues/20) resolved - All dailies' recurring due dates now show in the calendar, with a few potential limitations:
  - If a daily has a due date in the past, there's a chance it'll get placed at a date slightly off from when it should actually appear. This is because when a due date is in the past, Strategitica will use Habitica's API to find the next due date, and sometimes, for reasons unknown, that date is wrong. For example, If a daily's start date is on April 11th, 2020, and it's due every 12 months on that day of the month. In February 2021, that task should show up on April 11th, 2021. For some reason though, the Habitica API comes back with April 10th, 2021 as the earliest "next due" date. So basically, Strategitica sees April 10th, 2021 as the first date for this task, and it also sees that it should show up on April 11th, 2021 as well, so it adds both dates to the calendar. Not sure if there's much I can do about this.
  - If a daily is set to repeat monthly on a day of the month that doesn't exist for some month (e.g. on the 30th, but there's no 30th in February), that daily won't show up in that month, although Habitica will consider it due on the last day of that month. The one exception is if it's set to repeat on the 31st. Then, Strategitica will understand it should be due on the last day of the month. Unsure if anything can be done about this.

Changes above are in [pull request #27](https://github.com/iymeko/strategitica/pull/27).

## 1.0.2 (11 February, 2021)

* [#18](https://github.com/iymeko/strategitica/issues/18) resolved - Instead of having the user's API token as a URL parameter, there is now a login modal
* Updated readme to reflect above changes
* Reorganized JS a lot by switching to Node modules
* Other readme updates
* Fixed an issue with the exp bar showing the wrong info

Changes above are in [pull request #26](https://github.com/iymeko/strategitica/pull/21). Also:

* Stopped tags with long names from going outside the task modal on small screens

## 1.0.1 (4 February, 2021)

* [#17](https://github.com/iymeko/strategitica/issues/17) resolved - Fixed refresh link

## 1.0.0 (2 February, 2021)

* Initial commit
