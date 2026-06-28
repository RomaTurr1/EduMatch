import { ArrowRight, Calendar, Check, Clock3, Copy, Edit3, FileUp, Link, LogOut, Paperclip, PinOff, Send, Sparkles, Trash2, UserMinus, UsersRound, X } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { TagSelect } from "../components/TagSelect";
import { SKILL_OPTIONS, TECH_STACK_OPTIONS } from "../constants/skillOptions";
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
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingMessageBody, setEditingMessageBody] = useState("");
  const [messageMenu, setMessageMenu] = useState<{ message: ChatMessage; x: number; y: number } | null>(null);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinAnimation, setJoinAnimation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const joinAnimationTimer = useRef<number | null>(null);

  async function loadProject() {
    const result = await api<{ project: Project }>(`/projects/${projectId}`);
    setProject(result.project);
    setMessages(result.project.messages ?? []);
  }

  useEffect(() => {
    loadProject().catch(console.error);
  }, [projectId]);

  useEffect(() => {
    return () => {
      if (joinAnimationTimer.current) {
        window.clearTimeout(joinAnimationTimer.current);
      }
    };
  }, []);

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

  useEffect(() => {
    if (!messageMenu) return;
    const closeMenu = () => setMessageMenu(null);
    window.addEventListener("click", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, [messageMenu]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, projectId]);

  async function apply() {
    setActionError("");
    setIsJoining(true);
    try {
      await api(`/projects/${projectId}/applications`, {
        method: "POST",
        body: JSON.stringify({ note: "I would like to join this project." })
      });
      await loadProject();
      setJoinAnimation(true);
      if (joinAnimationTimer.current) {
        window.clearTimeout(joinAnimationTimer.current);
      }
      joinAnimationTimer.current = window.setTimeout(() => setJoinAnimation(false), 900);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not join project");
    } finally {
      setIsJoining(false);
    }
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
          techStack: selectedList(formData, "techStack"),
          requiredSkills: selectedList(formData, "requiredSkills"),
          status: String(formData.get("status")),
          isOpenToJoin: formData.get("isOpenToJoin") === "on",
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

  async function regenerateInvite() {
    if (!project) return;
    const result = await api<{ project: Project }>(`/projects/${project.id}/invite/regenerate`, { method: "POST" });
    setProject(result.project);
    setShareMenuOpen(false);
  }

  async function copyInviteLink() {
    if (!project?.inviteCode) return;
    await navigator.clipboard?.writeText(`${window.location.origin}/invite/${project.inviteCode}`).catch(() => undefined);
    setShareMenuOpen(false);
  }

  async function updateApplication(applicationId: string, status: "ACCEPTED" | "REJECTED") {
    if (!project) return;
    await api(`/projects/${project.id}/applications/${applicationId}`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    await loadProject();
  }

  function send(formData: FormData) {
    const body = String(formData.get("body") ?? "");
    if (!body.trim()) return;
    socket.emit("message:create", { projectId, body });
  }

  function submitChatForm(form: HTMLFormElement) {
    send(new FormData(form));
    form.reset();
  }

  function handleChatSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitChatForm(event.currentTarget);
  }

  function handleChatKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    if (event.currentTarget.form) {
      submitChatForm(event.currentTarget.form);
    }
  }

  function startMessageEdit(message: ChatMessage) {
    setMessageMenu(null);
    setEditingMessageId(message.id);
    setEditingMessageBody(message.body);
  }

  async function updateMessage(messageId: string) {
    const body = editingMessageBody.trim();
    if (!project || !body) return;
    const result = await api<{ message: ChatMessage }>(`/projects/${project.id}/messages/${messageId}`, {
      method: "PATCH",
      body: JSON.stringify({ body })
    });
    setMessages((current) => current.map((message) => (message.id === messageId ? result.message : message)));
    setEditingMessageId(null);
    setEditingMessageBody("");
  }

  async function deleteMessage(messageId: string, scope: "me" | "everyone") {
    if (!project) return;
    setMessageMenu(null);
    const label = scope === "everyone" ? "Delete this message for everyone?" : "Delete this message for you?";
    if (!window.confirm(label)) return;
    await api<void>(`/projects/${project.id}/messages/${messageId}`, {
      method: "DELETE",
      body: JSON.stringify({ scope })
    });
    setMessages((current) => current.filter((message) => message.id !== messageId));
  }

  function openMessageMenu(event: MouseEvent, message: ChatMessage) {
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 230;
    const menuHeight = 190;
    const isOwnMessage = message.user.id === user.id;
    const preferredX = isOwnMessage ? rect.right - menuWidth : rect.left + 28;
    const preferredY = rect.top - 10;
    setMessageMenu({
      message,
      x: Math.max(12, Math.min(preferredX, window.innerWidth - menuWidth - 12)),
      y: Math.max(12, Math.min(preferredY, window.innerHeight - menuHeight - 12))
    });
  }

  async function copyMessageText(message: ChatMessage) {
    setMessageMenu(null);
    await navigator.clipboard?.writeText(message.body).catch(() => undefined);
  }

  if (!project) return <p>Loading project...</p>;

  const isOwner = project.owner.id === user.id;
  const currentMembership = project.members.find((member) => member.user.id === user.id);
  const canChat = isOwner || Boolean(currentMembership);
  const canShareInvite = canChat && Boolean(project.inviteCode);
  const canApply = !isOwner && !currentMembership && (project.hasPersonalInvite || (project.isOpenToJoin && (project.status === "OPEN" || project.status === "IN_PROGRESS")));
  const canLeave = !isOwner && Boolean(currentMembership);
  const pinnedFiles = project.files ?? [];
  const pendingApplications = (project.applications ?? []).filter((application) => application.status === "PENDING");
  const allProjectTags = uniqueItems([...project.techStack, ...project.requiredSkills]);
  const previewDates = [
    ["Started", project.startedAt],
    ["Deadline", project.deadlineAt],
    ["Completed", project.completedAt]
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));
  const projectDates = [
    ["Created", project.createdAt],
    ["Started", project.startedAt],
    ["Deadline", project.deadlineAt],
    ["Completed", project.completedAt]
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  if (!canChat) {
    return (
      <section className={`project-detail-page project-preview-page ${isJoining ? "is-joining" : ""}`}>
        <div className="project-preview-experience">
          <div className="project-preview-spotlight">
            <div className="project-preview-spotlight-main">
              <div className="project-preview-kicker">
                <span><Sparkles size={14} /> Project room preview</span>
                <span className={`status ${project.isOpenToJoin || project.hasPersonalInvite ? "" : "muted-status"}`}>{project.hasPersonalInvite ? "Invited" : project.isOpenToJoin ? "Recruiting" : "Closed"}</span>
              </div>
              <h1>{project.title}</h1>
              <p>{project.description}</p>
              <div className="project-preview-quick-stats">
                <span><UsersRound size={15} /> {project.members.length} teammates</span>
                <span><Clock3 size={15} /> {previewDates.length ? "Timeline planned" : "Flexible timeline"}</span>
                <span><Check size={15} /> {allProjectTags.length || "Open"} tags</span>
              </div>
            </div>

            <aside className="project-preview-cta-card">
              <div className="project-preview-owner">
                <span className="avatar preview-owner-avatar">
                  {project.owner.avatarUrl ? <img src={project.owner.avatarUrl} alt={project.owner.name} /> : project.owner.name.slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <span>Project owner</span>
                  <strong>{project.owner.name}</strong>
                  <small>{project.owner.specialty || project.owner.university || "Student team lead"}</small>
                </div>
              </div>
              <div className="project-preview-cta-copy">
                <strong>{project.hasPersonalInvite ? "You are invited" : project.isOpenToJoin ? "Ready to join the room?" : "This room is currently closed"}</strong>
                <span>{project.hasPersonalInvite ? "Accept the invite and unlock chat, files, and the full project workspace." : project.isOpenToJoin ? "Join now and unlock chat, files, and the full project workspace." : "You can still preview the team, stack, and project structure."}</span>
              </div>
              {canApply ? (
                <button className="primary project-join-button" onClick={() => void apply()} disabled={isJoining}>
                  {isJoining ? "Joining..." : "Join project"}
                  <ArrowRight size={18} />
                </button>
              ) : (
                <button className="secondary project-join-button" disabled>
                  Not accepting joins
                </button>
              )}
              {actionError && <p className="error project-error">{actionError}</p>}
            </aside>
          </div>

          <div className="project-preview-command-grid">
            <article className="project-preview-panel project-preview-panel-map">
              <div className="project-preview-panel-heading">
                <span className="mini-icon"><Clock3 size={18} /></span>
                <div>
                  <h2>Project map</h2>
                  <p>Status, dates, and room activity at a glance.</p>
                </div>
              </div>
              <div className="project-preview-stat-grid">
                <div>
                  <span>Status</span>
                  <strong>{formatStatus(project.status)}</strong>
                </div>
                <div>
                  <span>Team</span>
                  <strong>{project.members.length} active</strong>
                </div>
                <div>
                  <span>Files</span>
                  <strong>{pinnedFiles.length} pinned</strong>
                </div>
              </div>
              <div className="project-preview-timeline">
                {previewDates.length ? previewDates.map(([label, value]) => (
                  <span key={label}>{label}: <strong>{formatDate(value)}</strong></span>
                )) : <span>No dates planned yet</span>}
              </div>
            </article>

            <article className="project-preview-panel project-preview-panel-stack">
              <div className="project-preview-panel-heading">
                <span className="mini-icon"><Check size={18} /></span>
                <div>
                  <h2>Stack & skills</h2>
                  <p>What the team is building with.</p>
                </div>
              </div>
              <div className="project-preview-tag-sections">
                <div>
                  <span>Tech stack</span>
                  <div className="tags">
                    {project.techStack.length ? project.techStack.map((tag) => <span key={tag}>{tag}</span>) : <span>No stack yet</span>}
                  </div>
                </div>
                <div>
                  <span>Needed skills</span>
                  <div className="tags">
                    {project.requiredSkills.length ? project.requiredSkills.map((tag) => <span key={tag}>{tag}</span>) : <span>Open role</span>}
                  </div>
                </div>
                {allProjectTags.length > 0 && (
                  <div>
                    <span>Project tags</span>
                    <div className="tags">
                      {allProjectTags.map((tag) => <span key={tag}>{tag}</span>)}
                    </div>
                  </div>
                )}
              </div>
            </article>

            <article className="project-preview-panel project-preview-panel-team">
              <div className="project-preview-panel-heading">
                <span className="mini-icon"><UsersRound size={18} /></span>
                <div>
                  <h2>Team</h2>
                  <p>People already inside the room.</p>
                </div>
              </div>
              <div className="project-preview-team-list">
                {project.members.slice(0, 4).map((member) => (
                  <div key={member.id}>
                    <span className="avatar small">{member.user.avatarUrl ? <img src={member.user.avatarUrl} alt={member.user.name} /> : member.user.name.slice(0, 1).toUpperCase()}</span>
                    <span>
                      <strong>{member.user.name}</strong>
                      <small>{member.role}</small>
                    </span>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`project-detail-page ${joinAnimation ? "project-room-enter" : ""}`}>
      <header className="page-header">
        <div>
          <h1>{project.title}</h1>
          <p>{project.description}</p>
        </div>
        <div className="project-actions">
          {(isOwner || canShareInvite) && (
            <>
              {isOwner && (
                <button className="secondary compact" onClick={() => setIsEditing((value) => !value)}>
                  {isEditing ? <X size={16} /> : <Edit3 size={16} />}
                  {isEditing ? "Cancel" : "Edit"}
                </button>
              )}
              <div className="project-share-wrap">
                <button className="secondary compact" onClick={() => setShareMenuOpen((open) => !open)}>
                  <Link size={16} />
                  Share
                </button>
                {shareMenuOpen && (
                  <div className="project-share-menu">
                    <small className="project-share-link">
                      {project.inviteCode ?? "No invite link yet"}
                    </small>
                    <button type="button" onClick={() => void copyInviteLink()}>
                      <Copy size={15} />
                      Copy link
                    </button>
                    {isOwner && (
                      <button type="button" onClick={() => void regenerateInvite()}>
                        <Link size={15} />
                        Regenerate link
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
          {canLeave && (
            <button className="danger-action compact" onClick={leaveProject}>
              <LogOut size={16} />
              Leave
            </button>
          )}
          {canApply && <button className="primary compact" onClick={() => void apply()} disabled={isJoining}>{isJoining ? "Joining..." : "Apply"}</button>}
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
          <TagSelect name="techStack" label="Tech stack" options={TECH_STACK_OPTIONS} defaultValue={project.techStack} />
          <TagSelect name="requiredSkills" label="Required skills" options={SKILL_OPTIONS} defaultValue={project.requiredSkills} />
          <div className="form-grid">
            <label>
              <span>Status</span>
              <select name="status" defaultValue={project.status}>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="PAUSED">Paused</option>
                <option value="COMPLETED">Completed</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </label>
            <label className="checkbox-row">
              <input name="isOpenToJoin" type="checkbox" defaultChecked={project.isOpenToJoin} />
              <span>Open to join</span>
            </label>
          </div>
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
          <div className="edit-form-actions">
            <button className="primary compact" type="submit">Save changes</button>
            <button className="danger-action compact" type="button" onClick={deleteProject}>
              <Trash2 size={16} />
              Delete project
            </button>
          </div>
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
                <span className="member-person">
                  <span className="avatar small">
                    {member.user.avatarUrl ? <img src={member.user.avatarUrl} alt={member.user.name} /> : member.user.name.slice(0, 1).toUpperCase()}
                  </span>
                  <strong>{member.user.name}</strong>
                </span>
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
          {isOwner && pendingApplications.length > 0 && (
            <>
              <div className="section-title compact-title">
                <h2>Join Requests</h2>
                <span>{pendingApplications.length} pending</span>
              </div>
              <div className="member-list">
                {pendingApplications.map((application) => (
                  <div key={application.id}>
                    <span className="member-person">
                      <span className="avatar small">
                        {application.user?.avatarUrl ? <img src={application.user.avatarUrl} alt={application.user.name} /> : application.user?.name.slice(0, 1).toUpperCase()}
                      </span>
                      <strong>{application.user?.name}</strong>
                    </span>
                    <span className="member-actions">
                      <button className="secondary compact" onClick={() => void updateApplication(application.id, "ACCEPTED")}><Check size={15} />Accept</button>
                      <button className="danger-icon" onClick={() => void updateApplication(application.id, "REJECTED")} title="Reject request"><X size={15} /></button>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
          <div className="section-title compact-title">
            <h2>Skills</h2>
            <span>Stack and roles</span>
          </div>
          <div className="tags">
            {allProjectTags.map((tag) => <span key={tag}>{tag}</span>)}
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
                    <strong>{displayFileName(file.originalName)}</strong>
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
              {messages.map((message) => {
                const isOwnMessage = message.user.id === user.id;
                const isMessageEditing = editingMessageId === message.id;
                const isCompactMessage = isCompactChatMessage(message);

                return (
                  <div
                    key={message.id}
                    className={`message-row ${isOwnMessage ? "own" : ""}`}
                    onContextMenu={(event) => openMessageMenu(event, message)}
                  >
                    {!isOwnMessage && (
                      <span className="message-avatar">
                        {message.user.avatarUrl ? <img src={message.user.avatarUrl} alt={message.user.name} /> : message.user.name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <div
                      className={`message ${isOwnMessage ? "own" : ""}`}
                    >
                      {!isOwnMessage && <strong className="message-author">{message.user.name}</strong>}
                      {isMessageEditing ? (
                        <div className="message-edit">
                          <input
                            value={editingMessageBody}
                            onChange={(event) => setEditingMessageBody(event.target.value)}
                            autoFocus
                          />
                          <div className="message-actions inline">
                            <button type="button" onClick={() => void updateMessage(message.id)}>Save</button>
                            <button type="button" onClick={() => setEditingMessageId(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : isCompactMessage ? (
                        <div className="message-inline">
                          <p>{displayMessageBody(message.body)}</p>
                          <span className="message-time">{formatTime(message.createdAt)}</span>
                        </div>
                      ) : (
                        <p>{displayMessageBody(message.body)}</p>
                      )}
                      {message.files?.map((file) => (
                        <a key={file.id} className="message-file" href={file.url} target="_blank" rel="noreferrer">
                          <Paperclip size={15} />
                          {displayFileName(file.originalName)}
                        </a>
                      ))}
                      {!isCompactMessage && (
                        <div className="message-meta">
                          {message.editedAt && !isMessageEditing && <span className="message-edited">edited</span>}
                          <span className="message-time">{formatTime(message.createdAt)}</span>
                        </div>
                      )}
                      {isCompactMessage && message.editedAt && !isMessageEditing && <span className="message-edited">edited</span>}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            {messageMenu && createPortal(
              <div
                className="message-menu-wrap"
                style={{ left: messageMenu.x, top: messageMenu.y }}
                onClick={(event) => event.stopPropagation()}
                onContextMenu={(event) => event.preventDefault()}
              >
                <div className="message-menu">
                  <button type="button" onClick={() => void copyMessageText(messageMenu.message)}>
                    <Copy size={18} />
                    <span>Copy text</span>
                  </button>
                  {messageMenu.message.user.id === user.id && (
                    <button type="button" onClick={() => startMessageEdit(messageMenu.message)}>
                      <Edit3 size={18} />
                      <span>Edit</span>
                    </button>
                  )}
                  <button type="button" onClick={() => void deleteMessage(messageMenu.message.id, "me")}>
                    <Trash2 size={18} />
                    <span>Delete for me</span>
                  </button>
                  {(messageMenu.message.user.id === user.id || isOwner) && (
                    <button type="button" className="danger" onClick={() => void deleteMessage(messageMenu.message.id, "everyone")}>
                      <Trash2 size={18} />
                      <span>Delete for everyone</span>
                    </button>
                  )}
                </div>
              </div>,
              document.body
            )}
            <form
              className="chat-form"
              onSubmit={handleChatSubmit}
            >
              <textarea name="body" placeholder="Message the project room" rows={1} onKeyDown={handleChatKeyDown} />
              <label className="secondary compact chat-upload" title="Attach file up to 16 MB">
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

function selectedList(formData: FormData, field: string) {
  return formData
    .getAll(field)
    .map((item) => String(item).trim())
    .filter(Boolean);
}

function nullableDate(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

function dateInputValue(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function decodeMojibake(value: string) {
  if (!/[ÃÐÑ]/.test(value)) return value;

  try {
    const bytes = Uint8Array.from(value, (char) => char.charCodeAt(0) & 0xff);
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return decoded.includes("\uFFFD") ? value : decoded;
  } catch {
    return value;
  }
}

function displayMessageBody(value: string) {
  return value.startsWith("Shared a file: ") ? decodeMojibake(value) : value;
}

function displayFileName(value: string) {
  return decodeMojibake(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function formatStatus(value: Project["status"]) {
  return value.toLowerCase().replace("_", " ");
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function isCompactChatMessage(message: ChatMessage) {
  return !message.files?.length && !message.body.includes("\n") && message.body.length <= 42;
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function uniqueItems(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}
