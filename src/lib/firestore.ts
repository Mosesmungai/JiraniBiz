import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getFirestoreDb } from "./firebase-admin";

export { FieldValue };

export const usersCollection = () => getFirestoreDb().collection("users");
export const sessionsCollection = () => getFirestoreDb().collection("sessions");
export const businessesCollection = () => getFirestoreDb().collection("businesses");
export const userEmailsCollection = () => getFirestoreDb().collection("userEmails");
export const businessSlugsCollection = () => getFirestoreDb().collection("businessSlugs");
export const servicesCollection = () => getFirestoreDb().collection("services");
export const leadsCollection = () => getFirestoreDb().collection("leads");
export const bookingsCollection = () => getFirestoreDb().collection("bookings");
export const reviewsCollection = () => getFirestoreDb().collection("reviews");
