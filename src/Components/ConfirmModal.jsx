export default function ConfirmModal({ isOpen, onConfirm, onCancel, message }) {
  if (!isOpen) return null;

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <h3>{message}</h3>

        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button style={cancelBtn} onClick={onCancel}>
            Cancel
          </button>

          <button style={deleteBtn} onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  backdropFilter: "blur(6px)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
};

const modalStyle = {
  background: "#111827",
  padding: "20px",
  borderRadius: "16px",
  width: "300px",
};

const cancelBtn = {
  flex: 1,
  padding: "10px",
  borderRadius: "10px",
  background: "#374151",
  color: "#fff",
};

const deleteBtn = {
  flex: 1,
  padding: "10px",
  borderRadius: "10px",
  background: "#ef4444",
  color: "#fff",
};