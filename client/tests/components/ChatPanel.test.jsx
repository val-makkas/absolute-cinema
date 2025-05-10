import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatPanel from 'src/components/ChatPanel';

describe('ChatPanel', () => {
  it('renders chat input and messages', () => {
    const messages = [
      { username: 'Alice', message: 'Hello', timestamp: Date.now() },
      { username: 'Bob', message: 'Hi', timestamp: Date.now() },
    ];
    render(
      <ChatPanel
        chatOpen={true}
        messages={messages}
        chatInput=""
        setChatInput={jest.fn()}
        handleSendChat={jest.fn()}
        status="connected"
        username="TestUser"
        onDisconnect={jest.fn()}
      />
    );
    expect(screen.getByText(/Hello/i)).toBeInTheDocument();
    expect(screen.getByText(/Hi/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Type a message/i)).toBeInTheDocument();
  });

  it('calls setChatInput when input changes', () => {
    const setChatInput = jest.fn();
    render(
      <ChatPanel
        chatOpen={true}
        messages={[]}
        chatInput=""
        setChatInput={setChatInput}
        handleSendChat={jest.fn()}
        status="connected"
        username="TestUser"
        onDisconnect={jest.fn()}
      />
    );
    fireEvent.change(screen.getByPlaceholderText(/Type a message/i), { target: { value: 'Test' } });
    expect(setChatInput).toHaveBeenCalledWith('Test');
  });

  it('calls handleSendChat when send button is clicked', () => {
    const handleSendChat = jest.fn();
    render(
      <ChatPanel
        chatOpen={true}
        messages={[]}
        chatInput="Test"
        setChatInput={jest.fn()}
        handleSendChat={handleSendChat}
        status="connected"
        username="TestUser"
        onDisconnect={jest.fn()}
      />
    );
    fireEvent.click(screen.getByText(/Send/i));
    expect(handleSendChat).toHaveBeenCalled();
  });
});
