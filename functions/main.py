# Welcome to your first Cloud Function for Firebase in Python!
# To learn more about Cloud Functions, see the documentation:
# https://firebase.google.com/docs/functions

from firebase_admin import initialize_app
from firebase_functions import firestore_fn, options

# The Firebase Admin SDK is initialized automatically by the Cloud Functions runtime.
initialize_app()


@firestore_fn.on_document_written("content/{docId}", region="us-central1")
def on_content_pending_analysis(
    event: firestore_fn.Event[firestore_fn.Change]
) -> None:
    """
    A Firestore-triggered function that runs when a document in the 'content'
    collection is written to. It checks for a 'pending-analysis' status and
    updates it to 'completed'.
    """
    
    doc_id = event.params.get("docId")
    print(f"Function triggered for document ID: {doc_id}")
    
    # Ensure there's data to process.
    if event.data is None:
        print(f"Item {doc_id}: Event has no data. Exiting.")
        return

    # A deletion event has no 'after' data.
    if event.data.after is None:
        print(f"Item {doc_id}: Document was deleted. No action taken.")
        return
        
    # Get a reference to the document.
    doc_ref = event.data.after.reference
    if not doc_ref:
        print(f"Item {doc_id}: Could not get document reference. Exiting.")
        return
        
    try:
        # Get the document data as a dictionary.
        data = event.data.after.to_dict()
        if data is None:
            print(f"Item {doc_id}: Document data is None after to_dict(). Exiting.")
            return

        status = data.get("status")
        
        print(f"Item {doc_id}: Current status is '{status}'.")

        # The core logic: only act on 'pending-analysis'.
        if status == "pending-analysis":
            print(f"Item {doc_id}: Matched 'pending-analysis'. Attempting update.")
            try:
                doc_ref.update({"status": "completed"})
                print(f"Item {doc_id}: Successfully updated status to 'completed'.")
            except Exception as e:
                print(f"CRITICAL: Failed to update document {doc_id}. Error: {e}")
        else:
            print(f"Item {doc_id}: Status is not 'pending-analysis'. No action needed.")

    except Exception as e:
        # Catch any other unexpected errors during data processing.
        print(f"CRITICAL: An unexpected error occurred for doc ID {doc_id}. Error: {e}")

    