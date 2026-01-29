// Add this replacement code for the sendMessage function in Chatbot.jsx

  // Send message with streaming
  const sendMessage = async () => {
    if (!message.trim() || isLoading || isStreaming) return;

    const userMessage = message.trim();
    setMessage('');
    setIsLoading(true);
    setIsStreaming(true);
    setStreamingMessage('');

    // Add user message to UI immediately
    const tempUserMsg = {
      id: Date.now(),
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    // Add thinking placeholder
    const thinkingMsg = {
      id: Date.now() + 1,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
      isThinking: true
    };
    setMessages(prev => [...prev, thinkingMsg]);

    try {
      const response = await fetch(`${API_URL}/api/chatbot/messages/stream`, {
        method: 'POST',
        headers: {
          'Authorization': getAuthToken(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userMessage,
          sessionId: sessionId
        })
      });

      if (!response.ok) {
        throw new Error('Stream request failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let messageId = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              
              if (data.type === 'start') {
                if (data.sessionId && !sessionId) {
                  setSessionId(data.sessionId);
                }
              } else if (data.type === 'content') {
                fullResponse = data.fullContent;
                setStreamingMessage(fullResponse);
                // Update the thinking message with streaming content
                setMessages(prev => 
                  prev.map(msg => 
                    msg.isThinking 
                      ? { ...msg, content: fullResponse, isThinking: false, isStreaming: true }
                      : msg
                  )
                );
              } else if (data.type === 'done') {
                messageId = data.messageId;
                // Finalize the streaming message
                setMessages(prev => 
                  prev.map(msg => 
                    msg.isStreaming 
                      ? { ...msg, id: messageId, isStreaming: false }
                      : msg
                  )
                );
              } else if (data.type === 'error') {
                throw new Error(data.error);
              }
            } catch (e) {
              // Skip malformed JSON
            }
          }
        }
      }

    } catch (error) {
      console.error('Error sending message:', error);
      // Remove thinking message and show error
      setMessages(prev => prev.filter(msg => !msg.isThinking && !msg.isStreaming));
      const errorMsg = {
        id: Date.now(),
        role: 'assistant',
        content: 'Sorry, I\'m having trouble connecting. Please try again.',
        created_at: new Date().toISOString(),
        isError: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      setStreamingMessage('');
    }
  };
