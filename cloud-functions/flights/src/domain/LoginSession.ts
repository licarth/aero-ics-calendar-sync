import { Cookie } from "set-cookie-parser";

export type LoginSession = {
  email: string;
  cookie: Cookie;
  pilotId: number;
};
