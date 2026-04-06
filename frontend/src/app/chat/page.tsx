"use client";

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuthStore } from '@/store/useAuthStore';

let socket: Socket | null = null;

interface Room {
  id: string;
  name: string;
  icon: string;
  isDM?: boolean;
}

interface OnlineUser {
  userId: string;
  email: string;
}

interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  senderEmail: string;
  content: string;
  createdAt: string;
}

export default function ChatPage() {
  const { user, token, logout } = useAuthStore();
  
  const [rooms, setRooms] = useState<Room[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUsers]);

  useEffect(() => {
    if (!token) return;

    const socketUrl = 'https://chat-services.redground-f9d124ef.centralindia.azurecontainerapps.io';
    socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Handle incoming data
    socket.on('rooms_update', (updatedRooms: Room[]) => {
      setRooms(updatedRooms);
      // Auto-join global or first room if no active room
      setActiveRoom((prev) => {
        if (!prev && updatedRooms.length > 0) {
          return updatedRooms[0];
        }
        return prev;
      });
    });

    socket.on('online_users_update', (users: OnlineUser[]) => {
      // Filter out self
      setOnlineUsers(users.filter(u => u.userId !== user?.id));
    });

    socket.on('message_history', (history: Message[]) => {
      setMessages(history);
    });

    socket.on('receive_message', (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.delete(msg.senderEmail);
        return next;
      });
    });

    socket.on('user_typing', ({ email }: { email: string }) => {
      setTypingUsers((prev) => new Set(prev).add(email));
    });

    socket.on('user_stop_typing', ({ email }: { email: string }) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.delete(email);
        return next;
      });
    });

    socket.on('error', (err: any) => {
      console.error('Socket error:', err);
    });
    
    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, [token, user?.id]);

  useEffect(() => {
    if (!socket || !isConnected || !activeRoom) return;
    socket.emit('join_conversation', activeRoom.id);
    setMessages([]);
    setTypingUsers(new Set());
  }, [activeRoom?.id, isConnected]);

  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    if (!socket || !isConnected || !activeRoom) return;

    socket.emit('typing', activeRoom.id);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket?.emit('stop_typing', activeRoom.id);
    }, 1500);
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim() && socket && isConnected && activeRoom) {
      socket.emit('send_message', {
        conversationId: activeRoom.id,
        content: inputMessage
      });
      setInputMessage('');
    }
  };

  const createRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRoomName.trim() && socket && isConnected) {
      socket.emit('create_room', { name: newRoomName.trim(), icon: '💬' });
      setNewRoomName('');
      setIsCreatingRoom(false);
    }
  };

  const getDMConversationId = (id1: string, id2: string) => {
    return [id1, id2].sort().join('_');
  };

  const startDM = (targetUser: OnlineUser) => {
    if (!user) return;
    setActiveRoom({
      id: getDMConversationId(user.id, targetUser.userId),
      name: targetUser.email,
      icon: '👤',
      isDM: true
    });
  };

  return (
    <ProtectedRoute>
      <div className="flex h-screen w-full bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/30">
        
        {/* Sidebar */}
        <aside className="w-72 bg-slate-900 border-r border-white/5 flex flex-col hidden md:flex">
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">
                N
              </div>
              <span className="font-bold tracking-tight">Nexus Chat</span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {/* Rooms Section */}
            <div>
              <div className="flex items-center justify-between px-3 mt-2 mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rooms</span>
                <button 
                  onClick={() => setIsCreatingRoom(!isCreatingRoom)}
                  className="text-slate-400 hover:text-emerald-400 transition-colors"
                  title="Create Room"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>

              {isCreatingRoom && (
                <form onSubmit={createRoom} className="px-3 mb-3">
                  <input
                    autoFocus
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="Room name..."
                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
                  />
                </form>
              )}

              <div className="space-y-1">
                {rooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => setActiveRoom(room)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                      activeRoom?.id === room.id 
                        ? 'bg-emerald-500/10 text-emerald-400' 
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`}
                  >
                    <span className="text-lg">{room.icon}</span>
                    <span className="font-medium text-sm truncate">{room.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Direct Messages Section */}
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-3">
                Online Users
              </div>
              <div className="space-y-1">
                {onlineUsers.length === 0 ? (
                  <div className="px-3 text-sm text-slate-600 italic">No one else is online</div>
                ) : (
                  onlineUsers.map((u) => {
                    const dmId = user ? getDMConversationId(user.id, u.userId) : '';
                    return (
                      <button
                        key={u.userId}
                        onClick={() => startDM(u)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                          activeRoom?.id === dmId
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                        }`}
                      >
                        <div className="relative flex-shrink-0">
                          <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs">
                            {u.email.charAt(0).toUpperCase()}
                          </div>
                          <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border-2 border-slate-900" />
                        </div>
                        <span className="font-medium text-sm truncate">{u.email}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

          </div>

          <div className="p-4 border-t border-white/5 bg-slate-900 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-semibold truncate max-w-[150px]">{user?.name || user?.email}</span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <span className="text-xs text-slate-500">{isConnected ? 'Online' : 'Offline'}</span>
              </div>
            </div>
            <button 
              onClick={logout}
              className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
              title="Logout"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </aside>

        {/* Chat Area */}
        <main className="flex-1 flex flex-col relative">
          {activeRoom ? (
            <>
              {/* Header */}
              <header className="h-16 border-b border-white/5 bg-slate-900/50 backdrop-blur-md flex items-center px-6 sticky top-0 z-10 shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{activeRoom.icon}</span>
                  <div>
                    <h2 className="font-semibold text-slate-100">{activeRoom.name}</h2>
                    <p className="text-xs text-slate-400">{activeRoom.isDM ? 'Direct Message' : 'Public Channel'}</p>
                  </div>
                </div>
              </header>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">
                {messages.length === 0 ? (
                   <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-3">
                     <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center text-3xl">
                       {activeRoom.icon}
                     </div>
                     <p>This is the start of {activeRoom.isDM ? 'your conversation with' : 'the'} <strong>{activeRoom.name}</strong>.</p>
                   </div>
                ) : (
                  messages.map((msg, i) => {
                    const isSelf = msg.senderId === user?.id;
                    const showHeader = i === 0 || messages[i-1].senderId !== msg.senderId;
                    
                    return (
                      <div key={msg._id || i} className={`flex flex-col max-w-[75%] ${isSelf ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                        {showHeader && !isSelf && (
                          <span className="text-xs text-slate-400 mb-1 ml-1">{msg.senderEmail || 'Unknown'}</span>
                        )}
                        <div className={`px-4 py-2.5 rounded-2xl ${
                          isSelf 
                            ? 'bg-emerald-500 text-slate-950 rounded-br-sm' 
                            : 'bg-slate-800 text-slate-100 rounded-bl-sm border border-white/5'
                        }`}>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                {typingUsers.size > 0 && (
                  <div className="flex items-center gap-2 text-slate-400 text-sm italic ml-2">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span>{Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 bg-slate-900 border-t border-white/5 flex-shrink-0">
               <form 
                  onSubmit={sendMessage}
                  className="max-w-4xl mx-auto flex items-end gap-2 bg-slate-800/50 border border-white/10 rounded-2xl p-2 focus-within:border-emerald-500/50 focus-within:bg-slate-800 transition-all"
                >
                  <textarea
                    value={inputMessage}
                    onChange={handleTyping}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage(e as any);
                      }
                    }}
                    placeholder={`Message ${activeRoom.name}...`}
                    className="flex-1 bg-transparent border-none outline-none text-slate-100 placeholder-slate-500 resize-none py-2 px-3 min-h-[40px] max-h-[120px] text-sm"
                    rows={1}
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || !isConnected}
                    className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center flex-shrink-0 transition-transform disabled:opacity-50 disabled:scale-100 hover:scale-105 active:scale-95"
                  >
                    <svg className="w-5 h-5 -mt-0.5 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              <p>Select a room or user to start chatting</p>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
