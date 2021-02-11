# `aero-ics-calendar-sync`

The calendar shows flilghts in the following interval : [t - 2 months, t + 2 months].

## Use this tool
### With iOS (iPad, iPhone)
<p float="left">
  <img src="docs/iCal.png" width=50% height=50%>
  <img src="docs/screenshot-iphone.jpeg" width=20% height=20%>
</p>

1. Go to Settings > Accounts > Add an account > Other.
2. Touch « Add a calendar with subscription ».
3. Paste this URL, after replaceing <AEROGEST_EMAIL> and <AEROGEST_PASSWORD> with your Aerogest credentials.
```
https://aero-ics-calendar-sync.licarth.com/flight-calendar?email=<AEROGEST_EMAIL>&password=<AEROGEST_PASSWORD>
```

> 💡 The servers of this application do not store your password. They use this password when required in order to login at `aerogest-online.fr` and get the list of your next flight reservations. Servers only store temporary credentials (cookies) to avoid having to login again everytime you refresh your calendar. 

### With Google Calendar
<img src="docs/gmail-screenshot.png" width=70% height=70%>

#### Directly with Google calendar 👎
> ⚠️ Not Recommended ⚠️ This will only refresh your calendar every 24h approximately

#### Using GAS-ICS-Sync 👍

Use the excellent [GAS-ICS-Sync](https://github.com/derekantrican/GAS-ICS-Sync) de `derekantrican`.

It's a Google Apps Script that syncs an .ics calendar with your Google Calendar and allow you to :
- choose the refresh interval. You're no longer stuck with Google's 24h
- receive notifications when one of your flights has changed.

1. Follow the [script installation instructions](https://github.com/derekantrican/GAS-ICS-Sync/wiki/Setting-up-the-script-manually).
2. In `Code.gs`, configure the script with the following variables: (replace `<AEROGEST_EMAIL>` & `<AEROGEST_PASSWORD>`. )
 ```javascript
var sourceCalendars = [                // The ics/ical urls that you want to get events from along with their target calendars (list a new row for each mapping of ICS url to Google Calendar)
  // For instance: ["https://www.calendarlabs.com/ical-calendar/ics/76/US_Holidays.ics", "US Holidays"]
  ["https://aero-ics-calendar-sync.licarth.com/flight-calendar?email=<AEROGEST_EMAIL>&password=<AEROGEST_PASSWORD>&lastUpdateInEventDescription=0", "Aerogest Flights 🛩"],
];

var howFrequent = 5;                  // What interval (minutes) to run this script on to check for new events
var onlyFutureEvents = false;          // If you turn this to "true", past events will not be synced (this will also removed past events from the target calendar if removeEventsFromCalendar is true)
var addEventsToCalendar = true;        // If you turn this to "false", you can check the log (View > Logs) to make sure your events are being read correctly before turning this on
var modifyExistingEvents = true;       // If you turn this to "false", any event in the feed that was modified after being added to the calendar will not update
var removeEventsFromCalendar = true;   // If you turn this to "true", any event created by the script that is not found in the feed will be removed.
var addAlerts = true;                  // Whether to add the ics/ical alerts as notifications on the Google Calendar events, this will override the standard reminders specified by the target calendar.
var addOrganizerToTitle = false;       // Whether to prefix the event name with the event organiser for further clarity
var descriptionAsTitles = false;       // Whether to use the ics/ical descriptions as titles (true) or to use the normal titles as titles (false)
var addCalToTitle = false;             // Whether to add the source calendar to title
var addAttendees = false;              // Whether to add the attendee list. If true, duplicate events will be automatically added to the attendees' calendar.
var defaultAllDayReminder = -1;        // Default reminder for all day events in minutes before the day of the event (-1 = no reminder, the value has to be between 0 and 40320)
// See https://github.com/derekantrican/GAS-ICS-Sync/issues/75 for why this is neccessary.
var addTasks = false;

var emailSummary = true;              // Will email you when an event is added/modified/removed to your calendar
var email = "<VOTRE_EMAIL>";                        // OPTIONAL: If "emailSummary" is set to true or you want to receive update notifications, you will need to provide your email address
 ```
