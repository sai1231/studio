
from firebase_functions import firestore_fn, options
from firebase_admin import initialize_app, firestore

# Initialize the Firebase Admin SDK.
initialize_app()

@firestore_fn.on_document_written(
    "content/{doc_id}",
    region="us-central1",
    secrets=[],
)
def on_content_pending_analysis(
    event: firestore_fn.Event[firestore_fn.Change | None],
) -> None:
    """
    A Cloud Function that triggers when a document in the 'content' collection
    is written. It checks if the content's status is 'pending-analysis' and
    updates it to 'completed'.
    """
    print(f"Function triggered for document ID: {event.params['doc_id']}")

    # Ensure there is data in the event.
    if event.data is None:
        print("No data associated with the event. Exiting function.")
        return

    # Get the data from after the write event.
    data_after = event.data.after
    if data_after is None:
        print("Document was deleted. No action needed.")
        return

    # Check if the 'status' field exists and is 'pending-analysis'.
    status = data_after.get("status")
    print(f"Document status is: '{status}'")

    if status == "pending-analysis":
        print("Status is 'pending-analysis'. Preparing to update.")
        
        # Get a reference to the Firestore document.
        db = firestore.client()
        doc_ref = db.collection("content").document(event.params['doc_id'])

        # Update the 'status' field to 'completed'.
        try:
            doc_ref.update({"status": "completed"})
            print(f"Successfully updated status to 'completed' for document {event.params['doc_id']}.")
        except Exception as e:
            print(f"Error updating document {event.params['doc_id']}: {e}")
    else:
        print("Status is not 'pending-analysis'. No update required.")

