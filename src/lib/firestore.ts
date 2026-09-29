import { FieldValue } from "firebase-admin/firestore";
import { firestore } from "./firebase-admin";

export { FieldValue };

export const usersCollection = firestore.collection("users");
export const sessionsCollection = firestore.collection("sessions");
export const businessesCollection = firestore.collection("businesses");
export const servicesCollection = firestore.collection("services");
export const leadsCollection = firestore.collection("leads");
export const bookingsCollection = firestore.collection("bookings");
export const reviewsCollection = firestore.collection("reviews");
