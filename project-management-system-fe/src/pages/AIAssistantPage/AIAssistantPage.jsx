import React from 'react';
import ChatHistorySidebar from './ChatHistorySidebar';
import ChatWindow from './ChatWindow';

const AIAssistantPage = () => {
  const [selectedSessionId, setSelectedSessionId] = React.useState(null);

  return (
    <div className="flex h-screen bg-gray-100">
      <ChatHistorySidebar 
        selectedSessionId={selectedSessionId}
        onSessionSelect={setSelectedSessionId} 
      />
      <ChatWindow 
        sessionId={selectedSessionId}
        onSessionChange={setSelectedSessionId}
      />
    </div>
  );
};

export default AIAssistantPage;
