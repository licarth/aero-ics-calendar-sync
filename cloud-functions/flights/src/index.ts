import { HttpFunction } from "@google-cloud/functions-framework/build/src/functions";
import { format } from "date-fns-tz";
import { FakeAerogestApi, ProductionAerogestApi } from "./aerogest";
const fakeAerogestApi = process.env.FAKE_AEROGEST_API === "true";

export const flights: HttpFunction = async (req, res) => {
  const email = req.query?.email ? req.query.email.toString() : null;
  const password = req.query?.password ? req.query?.password.toString() : null;
  const lastUpdateInEventDescription =
    req.query?.lastUpdateInEventDescription === "0" ? false : true;
  console.log(`[REQUEST] for user email:${email}`);

  if (!email || !password) {
    res.setHeader("content-type", "text/plain");
    res.send(
      "ERROR: please set email and password by appending ?email=...&password=... to your calendar URL.\n",
    );
    return;
  }

  const aerogest = fakeAerogestApi
    ? new FakeAerogestApi()
    : new ProductionAerogestApi({
        email,
        password,
      });

  //Check if login is necessary (if there are some )

  await aerogest.login();
  const flights = await aerogest.getAllScheduledFlights();
  const events = flights.map(
    ({
      aerogestId,
      aircraft,
      instructor,
      destination,
      dateFrom,
      dateTo,
      description,
      pilot,
    }) => {
      const dtstart = formatDate(dateFrom);
      const dtend = formatDate(dateTo);
      const formattedDescription = [
        `👨‍✈️ ${pilot}`,
        `🛩️ ${aircraft}`,
        instructor ? `👨‍🏫 ${instructor}` : null,
        description ? formatDescription(description) : null,
        lastUpdateInEventDescription
          ? `\\n🕐 Last Update: ${format(new Date(), "yyyy MMM dd',' HH:mm")}\r`
          : null,
      ]
        .filter((v) => !!v)
        .join("\\n\r\n ");

      return `BEGIN:VEVENT\r
UID:${aerogestId}@aerogest.licarth.com\r
SEQUENCE:1\r
CLASS:PUBLIC\r
CREATED:20210101T000000Z\r
GEO:43.6108;3.87672\r
DTSTAMP:${format(new Date(), "yyyyMMdd'T'HHmmss")}\r
${dateFrom.toISOString()}\r
DTSTART:${dtstart}\r
DTEND:${dtend}\r
DESCRIPTION:${formattedDescription}
LOCATION:${destination}\r
URL:https://aerogest.licarth.com\r
STATUS:CONFIRMED\r
SUMMARY:🛩️ ${aircraft}${instructor ? " | 👨‍🏫 " + instructor : ""} | 👨‍✈️${pilot}\r
TRANSP:TRANSPARENT\r
END:VEVENT\r`;
    },
  );
  res.setHeader("content-type", "text/calendar");
  res.send(`BEGIN:VCALENDAR\r
PRODID:Thomas Carli\r
X-WR-CALNAME:Aerogest 🛩\r
X-WR-TIMEZONE:Etc/UTC\r
VERSION:2.0\r
CALSCALE:GREGORIAN\r
REFRESH-INTERVAL;VALUE=DURATION:P1H
X-PUBLISHED-TTL:PT10M\r
METHOD:PUBLISH\r
${events.join("\n")}
END:VCALENDAR\r
`);
};

const formatDate = (dateFrom: Date) => {
  const isoDate = dateFrom.toISOString();
  const dtstart = `${isoDate.substr(0, 4)}${isoDate.substr(
    5,
    2,
  )}${isoDate.substr(8, 2)}T${isoDate.substr(11, 2)}${isoDate.substr(
    14,
    2,
  )}${isoDate.substr(17, 2)}Z`;
  return dtstart;
};

const chunk = (str: string, n: number) => {
  const ret = [];
  let i;
  let len;

  for (i = 0, len = str.length; i < len; i += n) {
    ret.push(str.substr(i, n));
  }

  return ret;
};

const formatDescription = (description: string, lineSize = 50) => {
  return "💬 " + chunk(description, lineSize).join("\r\n ");
};
