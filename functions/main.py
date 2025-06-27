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
    
    # Get the data from the document that was written to.
    # If the document was deleted, event.data will be None.
    if not event.data or not event.data.after:
        print(f"Document {event.params['docId']} was deleted. Ignoring.")
        return

    try:
        data = event.data.after.to_dict()
    except Exception as e:
        print(f"Could not parse document data for {event.params['docId']}: {e}")
        return

    doc_id = event.params["docId"]
    status = data.get("status")

    # If the status is not 'pending-analysis', there's nothing to do.
    if status != "pending-analysis":
        print(f"Item {doc_id}: Status is '{status}', not 'pending-analysis'. Ignoring.")
        return

    # This is our "Hello World" execution log.
    print(f"Hello from Python! Processing item: {doc_id}")

    # Update the status of the document to 'completed'.
    try:
        print(f"Updating item {doc_id} status to 'completed'.")
        event.data.after.reference.update({"status": "completed"})
        print(f"Successfully updated item {doc_id}.")
    except Exception as e:
        print(f"Error updating item {doc_id}: {e}")
