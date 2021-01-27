import axios from "axios";
import { add as addToDate, format, parse, isAfter } from "date-fns";
import { zonedTimeToUtc } from "date-fns-tz";
import * as admin from "firebase-admin";
import fs from "fs";
// @ts-ignore
import JSSoup from "jssoup";
import rp from "request-promise";
import { Cookie, parseString } from "set-cookie-parser";
import { collection, set, get } from "typesaurus";
import { LoginSession } from "./domain/LoginSession";
import { Email } from "./domain/Email";
import { AerogestFlight } from "./domain/AerogestFlight";
import { Opaque } from "./domain/opaque";

admin.initializeApp();
const loginSessions = collection<LoginSession>("login-sessions");

const AEROGEST_BASE = "https://online.aerogest.fr";
type AerogestApiParams = {
  email: Email;
  password: string;
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
  loadSession: () => Promise<LoginSession | null>;
  persistSession: ({
    cookie,
    pilotId,
  }: {
    cookie: Cookie;
    pilotId: number;
  }) => Promise<void>;
  getAllScheduledFlights: () => Promise<AerogestFlight[]>;
}

export class ProductionAerogestApi implements AerogestApi {
  private email: string;
  private password: string;
  private requestCookie?: Cookie;
  private pilotId?: number;

  constructor({ email, password }: AerogestApiParams) {
    this.email = email;
    this.password = password;
  }

  persistSession = async ({
    cookie,
    pilotId,
  }: {
    cookie: Cookie;
    pilotId: number;
  }) => {
    await set(loginSessions, this.email, {
      cookie,
      pilotId,
      email: this.email,
    }).then(
      () => {},
      () => {},
    );
  };

  loadSession = async () => {
    return await get(loginSessions, this.email).then((docOrNull) => {
      if (docOrNull) {
        const { cookie, email, pilotId } = docOrNull.data;
        if (cookie.expires && isAfter(cookie.expires, new Date())) {
          console.log(`Using existing cookie for ${email}`);
          this.email = email;
          this.pilotId = pilotId;
          this.requestCookie = cookie;
          return docOrNull.data;
        } else return null;
      } else return null;
    });
  };

  login = async () => {
    const { data, headers } = await axios.get(
      `${AEROGEST_BASE}/Connection/logon`,
    );
    const websiteCookie = parseString(headers["set-cookie"][0]);
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
        rememberMe: "true",
        __RequestVerificationToken: requestVerificationToken,
      },
      simple: false, //To avoid errors on 302
      headers: { Cookie: `${websiteCookie.name}=${websiteCookie.value}` },
      transform: (body, response) => {
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
    const pilotId = new JSSoup(myBookingsPageData).find("input", {
      id: "idCurrentPilot",
    }).attrs.value;
    if (!pilotId) {
      throw new Error("Pilot id could not be retrieved!");
    } else {
      this.pilotId = Number(pilotId);
      await this.persistSession({
        cookie: this.requestCookie,
        pilotId,
      });
    }
  };

  getAllScheduledFlights = async (): Promise<AerogestFlight[]> => {
    console.log("Getting flights");
    const now = new Date();
    const flights = await rp({
      uri: `${AEROGEST_BASE}/api/Schedule/BookingAPI/BookingsList`,
      method: "POST",
      json: true,
      form: {
        d: format(now, "yyyyMMdd"),
        f: format(addToDate(now, { months: 2 }), "yyyyMMdd"),
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
  loadSession: () => Promise<LoginSession | null> = () => Promise.resolve(null);
  persistSession: () => Promise<void> = () => Promise.resolve();
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
