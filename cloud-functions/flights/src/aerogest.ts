import axios from "axios";
import { add, format, parse } from "date-fns";
import { zonedTimeToUtc } from "date-fns-tz";
import fs from "fs";

// @ts-ignore
import JSSoup from "jssoup";
import rp from "request-promise";
import { Cookie, parseString } from "set-cookie-parser";
import { Opaque } from "./opaque";

const AEROGEST_BASE = "https://online.aerogest.fr";
type AerogestApiParams = {
  email: string;
  password: string;
};

export type AerogestId = Opaque<"AerogestId", number>;
export type Pilot = Opaque<"Pilot", string>;
export type Aircraft = Opaque<"Aircraft", string>;
export type Instructor = Opaque<"Instructor", string>;
export type FlightDescription = Opaque<"FlightDescription", string>;
export type Airport = Opaque<"Airport", string>;
export type Title = Opaque<"Title", string>;

type AerogestFlight = {
  aerogestId: AerogestId;
  dateFrom: Date;
  dateTo: Date;
  pilot: Pilot;
  aircraft: Aircraft;
  instructor: Instructor;
  description: FlightDescription;
  destination: Airport;
  title: Title;
};

type ApiFlight = {
  bi: string;
  d: string;
  f: string;
  p: string;
  a: string;
  i: string;
  desc: string;
  dest: string;
  t: string;
};

export interface AerogestApi {
  login: () => Promise<void>;
  getAllScheduledFlights: () => Promise<AerogestFlight[]>;
}

export class ProductionAerogestApi implements AerogestApi {
  private email: string;
  private password: string;
  private requestCookie?: Cookie;
  private websiteCookie?: Cookie;
  private pilotId?: number;

  constructor({ email, password }: AerogestApiParams) {
    this.email = email;
    this.password = password;
  }

  login = async () => {
    const { data, headers } = await axios.get(
      `${AEROGEST_BASE}/Connection/logon`,
    );
    const websiteCookie = parseString(headers["set-cookie"][0]);
    this.websiteCookie = websiteCookie;
    const soup = new JSSoup(data);
    const requestVerificationToken = soup.find("input", {
      name: "__RequestVerificationToken",
    }).attrs.value;

    const response = await rp({
      uri: `${AEROGEST_BASE}/Connection/logon`,
      method: "POST",
      form: {
        login: this.email,
        password: this.password,
        rememberMe: "false",
        __RequestVerificationToken: requestVerificationToken,
      },
      simple: false, //To avoid errors on 302
      headers: { Cookie: `${websiteCookie.name}=${websiteCookie.value}` },
      transform: (body, response, resolveWithFullResponse) => {
        return { headers: response.headers, data: body };
      },
    });
    this.requestCookie = parseString(response.headers["set-cookie"][0]);

    const myBookingsPageData = await rp.get({
      uri: `${AEROGEST_BASE}/Schedule/Booking/MyBookings`,
      headers: {
        Cookie: `${this.requestCookie?.name}=${this.requestCookie?.value}`,
      },
    });
    this.pilotId = new JSSoup(myBookingsPageData).find("input", {
      id: "idCurrentPilot",
    }).attrs.value;
  };

  getAllScheduledFlights = async (): Promise<AerogestFlight[]> => {
    const now = new Date();
    const flights = await rp({
      uri: `${AEROGEST_BASE}/api/Schedule/BookingAPI/BookingsList`,
      method: "POST",
      json: true,
      form: {
        d: format(now, "yyyyMMdd"),
        f: format(add(now, { months: 2 }), "yyyyMMdd"),
        i: this.pilotId,
        t: "usr",
      },
      simple: false, //To avoid errors on 302
      headers: {
        Cookie: `${this.requestCookie?.name}=${this.requestCookie?.value}`,
      },
    });

    return mapToAerogestFlights(flights);
  };

  isLoggedIn = () => {
    return !!this.requestCookie;
  };
}
const mapToAerogestFlights = (flights: ApiFlight[]) =>
  flights.map(({ bi, d, f, p, a, i, desc, dest, t }: ApiFlight) => {
    return {
      aerogestId: Number(bi) as Opaque<"AerogestId", number>,
      dateFrom: aerogestDateToUTCDate(d),
      dateTo: aerogestDateToUTCDate(f),
      pilot: p as Opaque<"Pilot", string>,
      aircraft: a as Opaque<"Aircraft", string>,
      instructor: i as Opaque<"Instructor", string>,
      description: desc as Opaque<"FlightDescription", string>,
      destination: dest as Opaque<"Airport", string>,
      title: t as Opaque<"Title", string>,
    };
  });

export class FakeAerogestApi implements AerogestApi {
  login: () => Promise<void> = () => Promise.resolve();
  getAllScheduledFlights: () => Promise<AerogestFlight[]> = () => {
    return Promise.resolve(
      mapToAerogestFlights(
        JSON.parse(
          fs.readFileSync(__dirname + "/api_response.json").toString(),
        ) as ApiFlight[],
      ),
    );
  };
}

function aerogestDateToUTCDate(d: string): any {
  return zonedTimeToUtc(
    format(parse(d, "dd/MM/yyyy HH:mm", new Date()), "yyyy-MM-dd HH:mm:ss"),
    "Europe/Paris",
  );
}
