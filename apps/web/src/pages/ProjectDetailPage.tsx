import { Send, UserMinus, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";
import { useSocket } from "../hooks/useSocket";
import { api } from "../services/api";
import type { ChatMessage, Project, User } from "../types/api";

type Props = {
  projectId: string;
  user: User;
};

export function ProjectDetailPage({ projectId, user }: Props) {
  const socket = useSocket();
  const [project, setProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

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

  return (
    <section>
      <header className="page-header">
        <div>
          <h1>{project.title}</h1>
          <p>{project.description}</p>
        </div>
        {canApply && <button className="primary compact" onClick={apply}>Apply</button>}
      </header>
      <div className={`detail-layout ${canChat ? "" : "single"}`}>
        <div>
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
              <button title="Send message"><Send size={18} /></button>
            </form>
          </div>
        )}
      </div>
    </section>
  );
}
