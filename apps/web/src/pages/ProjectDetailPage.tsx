import { Calendar, Edit3, FileUp, History, LogOut, Paperclip, PinOff, Send, Trash2, UserMinus, UsersRound, X } from "lucide-react";
import { useEffect, useState, type ChangeEvent } from "react";
import { useSocket } from "../hooks/useSocket";
import { api, apiFormData } from "../services/api";
import type { ChatMessage, Project, ProjectFile, User } from "../types/api";

type Props = {
  projectId: string;
  user: User;
  onClose: () => void;
};

export function ProjectDetailPage({ projectId, user, onClose }: Props) {
  const socket = useSocket();
  const [project, setProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [actionError, setActionError] = useState("");
  const [fileError, setFileError] = useState("");

  async function loadProject() {
    const result = await api<{ project: Project }>(`/projects/${projectId}`);
    setProject(result.project);
    setMessages(result.project.messages ?? []);
  }

  useEffect(() => {
    loadProject().catch(console.error);
  }, [projectId]);

  useEffect(() => {
    if (!project) return;
    const canChat = project.owner.id === user.id || project.members.some((member) => member.user.id === user.id);
    if (!canChat) return;

    socket.emit("project:join", projectId);
    socket.on("message:new", (message: ChatMessage) => {
      setMessages((current) => [...current, message]);
    });
    return () => {
      socket.off("message:new");
    };
  }, [socket, projectId, project, user.id]);

  async function apply() {
    await api(`/projects/${projectId}/applications`, {
      method: "POST",
      body: JSON.stringify({ note: "I would like to join this project." })
    });
    await loadProject();
  }

  async function removeMember(userId: string) {
    await api<void>(`/projects/${projectId}/members/${userId}`, { method: "DELETE" });
    await loadProject();
  }

  async function updateProject(formData: FormData) {
    if (!project) return;
    setActionError("");
    try {
      await api<{ project: Project }>(`/projects/${project.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: String(formData.get("title")),
          description: String(formData.get("description")),
          techStack: splitList(formData.get("techStack")),
          requiredSkills: splitList(formData.get("requiredSkills")),
          deadlineAt: nullableDate(formData.get("deadlineAt")),
          startedAt: nullableDate(formData.get("startedAt")),
          completedAt: nullableDate(formData.get("completedAt"))
        })
      });
      setIsEditing(false);
      await loadProject();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not update project");
    }
  }

  async function deleteProject() {
    if (!project || !window.confirm("Delete this project?")) return;
    setActionError("");
    try {
      await api<void>(`/projects/${project.id}`, { method: "DELETE" });
      onClose();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not delete project");
    }
  }

  async function leaveProject() {
    if (!project || !window.confirm("Leave this project?")) return;
    setActionError("");
    try {
      await api<void>(`/projects/${project.id}/membership`, { method: "DELETE" });
      onClose();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not leave project");
    }
  }

  async function uploadPinnedFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !project) return;
    setFileError("");
    const formData = new FormData();
    formData.set("file", file);
    try {
      await apiFormData<{ file: ProjectFile }>(`/projects/${project.id}/files`, formData);
      await loadProject();
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "Could not upload file");
    } finally {
      event.target.value = "";
    }
  }

  async function uploadChatFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !project) return;
    setFileError("");
    const formData = new FormData();
    formData.set("file", file);
    try {
      const result = await apiFormData<{ message: ChatMessage }>(`/projects/${project.id}/messages/files`, formData);
      setMessages((current) => [...current, result.message]);
      await loadProject();
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "Could not upload file");
    } finally {
      event.target.value = "";
    }
  }

  async function unpinFile(fileId: string) {
    if (!project) return;
    await api(`/projects/${project.id}/files/${fileId}`, {
      method: "PATCH",
      body: JSON.stringify({ isPinned: false })
    });
    await loadProject();
  }

  function send(formData: FormData) {
    const body = String(formData.get("body") ?? "");
    if (!body.trim()) return;
    socket.emit("message:create", { projectId, body });
  }

  if (!project) return <p>Loading project...</p>;

  const isOwner = project.owner.id === user.id;
  const currentMembership = project.members.find((member) => member.user.id === user.id);
  const canChat = isOwner || Boolean(currentMembership);
  const canApply = !isOwner && !currentMembership;
  const canLeave = !isOwner && Boolean(currentMembership);
  const pinnedFiles = project.files ?? [];
  const projectDates = [
    ["Created", project.createdAt],
    ["Started", project.startedAt],
    ["Deadline", project.deadlineAt],
    ["Completed", project.completedAt]
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>{project.title}</h1>
          <p>{project.description}</p>
        </div>
        <div className="project-actions">
          {isOwner && (
            <>
              <button className="secondary compact" onClick={() => setIsEditing((value) => !value)}>
                {isEditing ? <X size={16} /> : <Edit3 size={16} />}
                {isEditing ? "Cancel" : "Edit"}
              </button>
              <button className="danger-action compact" onClick={deleteProject}>
                <Trash2 size={16} />
                Delete
              </button>
            </>
          )}
          {canLeave && (
            <button className="danger-action compact" onClick={leaveProject}>
              <LogOut size={16} />
              Leave
            </button>
          )}
          {canApply && <button className="primary compact" onClick={apply}>Apply</button>}
        </div>
      </header>
      {actionError && <p className="error project-error">{actionError}</p>}
      {isOwner && isEditing && (
        <form
          className="inline-form"
          onSubmit={(event) => {
            event.preventDefault();
            void updateProject(new FormData(event.currentTarget));
          }}
        >
          <input name="title" defaultValue={project.title} placeholder="Project title" required minLength={3} />
          <textarea name="description" defaultValue={project.description} placeholder="Description, at least 10 characters" required minLength={10} />
          <input name="techStack" defaultValue={project.techStack.join(", ")} placeholder="React, Node, PostgreSQL" />
          <input name="requiredSkills" defaultValue={project.requiredSkills.join(", ")} placeholder="UI, API, DevOps" />
          <div className="form-grid">
            <label>
              <span>Started</span>
              <input name="startedAt" type="date" defaultValue={dateInputValue(project.startedAt)} />
            </label>
            <label>
              <span>Deadline</span>
              <input name="deadlineAt" type="date" defaultValue={dateInputValue(project.deadlineAt)} />
            </label>
            <label>
              <span>Completed</span>
              <input name="completedAt" type="date" defaultValue={dateInputValue(project.completedAt)} />
            </label>
          </div>
          <button className="primary" type="submit">Save changes</button>
        </form>
      )}
      <div className={`detail-layout ${canChat ? "" : "single"}`}>
        <div>
          <div className="section-title compact-title">
            <h2>Dates</h2>
            <span>Timeline</span>
          </div>
          <div className="member-list">
            {projectDates.map(([label, value]) => (
              <div key={label}>
                <span className="member-person"><Calendar size={16} /><strong>{label}</strong></span>
                <span>{formatDate(value)}</span>
              </div>
            ))}
          </div>
          <div className="section-title compact-title">
            <h2>Members</h2>
            <span>{project.members.length} active</span>
          </div>
          <div className="member-list">
            {project.members.map((member) => (
              <div key={member.id}>
                <span className="member-person"><span className="avatar small">{member.user.name.slice(0, 1).toUpperCase()}</span><strong>{member.user.name}</strong></span>
                <span className="member-actions">
                  <span className="status">{member.role}</span>
                  {isOwner && member.user.id !== user.id && member.role !== "owner" && (
                    <button className="danger-icon" onClick={() => removeMember(member.user.id)} title="Remove member">
                      <UserMinus size={16} />
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
          <div className="section-title compact-title">
            <h2>Skills</h2>
            <span>Stack and roles</span>
          </div>
          <div className="tags">
            {[...project.techStack, ...project.requiredSkills].map((tag) => <span key={tag}>{tag}</span>)}
          </div>
          <div className="section-title compact-title">
            <h2>Pinned Files</h2>
            {canChat && (
              <label className="secondary compact file-action">
                <FileUp size={16} />
                Upload
                <input type="file" onChange={uploadPinnedFile} />
              </label>
            )}
          </div>
          <div className="member-list">
            {pinnedFiles.length === 0 ? (
              <div><span>No pinned files yet</span></div>
            ) : (
              pinnedFiles.map((file) => (
                <div key={file.id}>
                  <a className="file-row" href={file.url} target="_blank" rel="noreferrer">
                    <Paperclip size={16} />
                    <strong>{file.originalName}</strong>
                  </a>
                  <span className="member-actions">
                    <span>{formatBytes(file.size)}</span>
                    {isOwner && (
                      <button className="danger-icon" onClick={() => unpinFile(file.id)} title="Unpin file">
                        <PinOff size={16} />
                      </button>
                    )}
                  </span>
                </div>
              ))
            )}
          </div>
          {fileError && <p className="error project-error">{fileError}</p>}
          <div className="section-title compact-title">
            <h2>History</h2>
            <span><History size={14} /> Latest changes</span>
          </div>
          <div className="member-list">
            {(project.history ?? []).length === 0 ? (
              <div><span>No history yet</span></div>
            ) : (
              project.history!.map((item) => (
                <div key={item.id}>
                  <span className="history-row"><strong>{item.message}</strong></span>
                  <span>{formatDate(item.createdAt)}</span>
                </div>
              ))
            )}
          </div>
        </div>
        {canChat && (
          <div className="chat-panel">
            <div className="chat-heading">
              <div className="mini-icon"><UsersRound size={20} /></div>
              <div>
                <h2>Realtime Chat</h2>
                <p>{messages.length} messages in this project room</p>
              </div>
            </div>
            <div className="messages">
              {messages.map((message) => (
                <div key={message.id} className="message">
                  <strong>{message.user.name}</strong>
                  <p>{message.body}</p>
                  {message.files?.map((file) => (
                    <a key={file.id} className="message-file" href={file.url} target="_blank" rel="noreferrer">
                      <Paperclip size={15} />
                      {file.originalName}
                    </a>
                  ))}
                </div>
              ))}
            </div>
            <form
              className="chat-form"
              onSubmit={(event) => {
                event.preventDefault();
                send(new FormData(event.currentTarget));
                event.currentTarget.reset();
              }}
            >
              <input name="body" placeholder="Message the project room" />
              <label className="secondary compact chat-upload" title="Attach file">
                <Paperclip size={18} />
                <input type="file" onChange={uploadChatFile} />
              </label>
              <button title="Send message"><Send size={18} /></button>
            </form>
          </div>
        )}
      </div>
    </section>
  );
}

function splitList(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function nullableDate(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

function dateInputValue(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}
