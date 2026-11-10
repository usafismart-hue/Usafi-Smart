/* ==========================================================================
   USAFI SMART — Firebase Storage helpers (Modular SDK, ES module)

   Exposes the storage instance and the upload/delete functions.
   `ref` is exported as `storageRef` so it is never confused with the Realtime
   Database `ref` from database.js.

   PRIVATE DOCUMENTS (NIDA, BRELA, licences, integrity forms):
   - Store them under a path tied to the owner's UID and protect it with
     Storage Rules (owner can upload, only the owner and admins can read).
   - Do NOT publish or share getDownloadURL() links for private documents.
     Access them only through authenticated reads allowed by the rules.
   - Allowed types: PDF, JPG, PNG. Initial maximum size: 5 MB per file
     (also enforce this in the Storage Rules, not only in the browser).
   ========================================================================== */

import { storage } from "./firebase-config.js";
import {
  ref as storageRef,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-storage.js";

export { storage };

export const ALLOWED_DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"];
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024; // 5 MB

/** Returns an error message (string) if the file is not acceptable, else null. */
export function validateDocument(file) {
  if (!file) return "Hakuna faili lililochaguliwa.";
  if (ALLOWED_DOCUMENT_TYPES.indexOf(file.type) === -1) {
    return "Aina ya faili hairuhusiwi. Tumia PDF, JPG au PNG.";
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return "Faili ni kubwa mno. Kikomo ni MB 5.";
  }
  return null;
}

export {
  storageRef,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
};
