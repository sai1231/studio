# Welcome to your first Cloud Function for Firebase in Python!
# To learn more about Cloud Functions, see the documentation:
# https://firebase.google.com/docs/functions

import firebase_admin
from firebase_admin import firestore
from firebase_functions import options, firestore_fn

# Initialize the Firebase Admin SDK.
# This is required for the function to interact with Firestore.
firebase_admin.initialize_app()
# Set the region for the function.
options.set_global_options(region="us-central1")


@firestore_fn.on_document_written("content/{docId}")
def on_content_pending_analysis(
    event: firestore_fn.Event[firestore_fn.Change | None],
) -> None:
    """
    A Cloud Function that triggers when a document in the 'content' collection
    is written. It checks for a 'pending-analysis' status and updates it to
    'completed'. This serves as a robust, asynchronous background job.
    """
    print(f"Function triggered for document ID: {event.params['docId']}")

    # Get the new data from the event.
    # event.data.after is the state of the document after the write.
    new_data = event.data.after

    # Ensure there is data to process.
    if new_data is None:
        print("Document was deleted, no action taken.")
        return

    # Check if the 'status' field is 'pending-analysis'.
    status = new_data.get("status")
    print(f"Document status is: '{status}'")

    if status == "pending-analysis":
        print(f"Status is 'pending-analysis'. Preparing to update document.")

        # Get a reference to the document that was written to.
        doc_ref = new_data.reference

        # Update the 'status' field to 'completed'.
        try:
            doc_ref.update({"status": "completed"})
            print("Successfully updated status to 'completed'.")
        except Exception as e:
            print(f"Error updating document: {e}")
    else:
        print("Status is not 'pending-analysis', no update performed.")
