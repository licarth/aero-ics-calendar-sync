import { Opaque } from "./opaque";

export type AerogestId = Opaque<"AerogestId", number>;
export type Pilot = Opaque<"Pilot", string>;
export type Aircraft = Opaque<"Aircraft", string>;
export type Instructor = Opaque<"Instructor", string>;
export type FlightDescription = Opaque<"FlightDescription", string>;
export type Airport = Opaque<"Airport", string>;
export type Title = Opaque<"Title", string>;

export type AerogestFlight = {
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
