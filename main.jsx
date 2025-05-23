import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  Alert,
  Dimensions,
  Image,
  StatusBar,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  PermissionsAndroid
} from 'react-native';
import { RNCamera } from 'react-native-camera';
import DocumentPicker from 'react-native-document-picker';
import AudioRecord from 'react-native-audio-record';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width, height } = Dimensions.get('window');

const AvatarChatApp = () => {
  const [avatars, setAvatars] = useState([]);
  const [activeAvatar, setActiveAvatar] = useState(null);
  const [messages, setMessages] = useState({});
  const [inputMessage, setInputMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [newAvatarName, setNewAvatarName] = useState('');
  const [newAvatarDescription, setNewAvatarDescription] = useState('');
  const [capturedImage, setCapturedImage] = useState(null);
  const [detectedPerson, setDetectedPerson] = useState(null);
  const [currentView, setCurrentView] = useState('avatars'); // 'avatars', 'chat', 'camera'
  
  const cameraRef = useRef(null);

  useEffect(() => {
    requestCameraPermission();
    setupAudioRecord();
  }, []);

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'Avatar Chat needs camera access to recognize faces',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const setupAudioRecord = () => {
    const options = {
      sampleRate: 16000,
      channels: 1,
      bitsPerSample: 16,
      audioSource: 6,
      wavFile: 'test.wav'
    };
    AudioRecord.init(options);
  };

  // Avatar Management
  const createAvatar = (imageUri = null) => {
    if (!newAvatarName.trim()) return;
    
    const newAvatar = {
      id: Date.now(),
      name: newAvatarName,
      description: newAvatarDescription,
      image: imageUri,
      documents: [],
      images: [],
      createdAt: new Date().toISOString()
    };
    
    setAvatars([...avatars, newAvatar]);
    setMessages(prev => ({ ...prev, [newAvatar.id]: [] }));
    setNewAvatarName('');
    setNewAvatarDescription('');
    setCapturedImage(null);
    setShowCreateModal(false);
    setCurrentView('avatars');
  };

  const deleteAvatar = (avatarId) => {
    Alert.alert(
      'Delete Avatar',
      'Are you sure you want to delete this avatar?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            setAvatars(avatars.filter(a => a.id !== avatarId));
            const newMessages = { ...messages };
            delete newMessages[avatarId];
            setMessages(newMessages);
            if (activeAvatar?.id === avatarId) {
              setActiveAvatar(null);
              setCurrentView('avatars');
            }
          }
        }
      ]
    );
  };

  // File Upload
  const handleFileUpload = async () => {
    if (!activeAvatar) return;
    
    try {
      const results = await DocumentPicker.pickMultiple({
        type: [DocumentPicker.types.allFiles],
      });
      
      const updatedAvatars = avatars.map(avatar => {
        if (avatar.id === activeAvatar.id) {
          const newFiles = results.map(file => ({
            id: Date.now() + Math.random(),
            name: file.name,
            type: file.type,
            size: file.size,
            uri: file.uri,
            uploadedAt: new Date().toISOString()
          }));
          
          const isImage = (type) => type && type.startsWith('image/');
          const newDocuments = newFiles.filter(f => !isImage(f.type));
          const newImages = newFiles.filter(f => isImage(f.type));
          
          return {
            ...avatar,
            documents: [...avatar.documents, ...newDocuments],
            images: [...avatar.images, ...newImages]
          };
        }
        return avatar;
      });
      
      setAvatars(updatedAvatars);
      setActiveAvatar(updatedAvatars.find(a => a.id === activeAvatar.id));
      
      // Add system message about upload
      const uploadMessage = {
        id: Date.now(),
        content: `Uploaded ${results.length} file(s): ${results.map(f => f.name).join(', ')}`,
        sender: 'system',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => ({
        ...prev,
        [activeAvatar.id]: [...(prev[activeAvatar.id] || []), uploadMessage]
      }));
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        // User cancelled
      } else {
        Alert.alert('Error', 'Failed to upload files');
      }
    }
  };

  // Messaging
  const sendMessage = () => {
    if (!inputMessage.trim() || !activeAvatar) return;
    
    const userMessage = {
      id: Date.now(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date().toISOString()
    };
    
    const avatarResponse = {
      id: Date.now() + 1,
      content: `Hello! I'm ${activeAvatar.name}. I received your message: "${inputMessage}". I have access to ${activeAvatar.documents.length} documents and ${activeAvatar.images.length} images to help answer your questions.`,
      sender: 'avatar',
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => ({
      ...prev,
      [activeAvatar.id]: [...(prev[activeAvatar.id] || []), userMessage, avatarResponse]
    }));
    
    setInputMessage('');
  };

  // Voice Recording
  const startRecording = async () => {
    try {
      await AudioRecord.start();
      setIsRecording(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    try {
      const audioFile = await AudioRecord.stop();
      setIsRecording(false);
      handleVoiceMessage(audioFile);
    } catch (error) {
      Alert.alert('Error', 'Failed to stop recording');
    }
  };

  const handleVoiceMessage = (audioFile) => {
    if (!activeAvatar) return;
    
    const voiceMessage = {
      id: Date.now(),
      content: '[Voice Message]',
      sender: 'user',
      timestamp: new Date().toISOString(),
      isVoice: true
    };
    
    const avatarResponse = {
      id: Date.now() + 1,
      content: `I received your voice message! As ${activeAvatar.name}, I would process your audio and respond accordingly. I have ${activeAvatar.documents.length} documents and ${activeAvatar.images.length} images in my knowledge base.`,
      sender: 'avatar',
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => ({
      ...prev,
      [activeAvatar.id]: [...(prev[activeAvatar.id] || []), voiceMessage, avatarResponse]
    }));
  };

  // Camera Functions
  const takePicture = async () => {
    if (cameraRef.current) {
      const options = { quality: 0.5, base64: true };
      const data = await cameraRef.current.takePictureAsync(options);
      setCapturedImage(data.uri);
      
      // Simulate face recognition
      setTimeout(() => {
        const matchedAvatar = avatars.find(avatar => 
          avatar.image && Math.random() > 0.5 // Simulate 50% match rate
        );
        
        if (matchedAvatar) {
          setDetectedPerson(matchedAvatar);
          Alert.alert(
            'Avatar Detected!',
            `Found existing avatar: ${matchedAvatar.name}`,
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Chat Now', 
                onPress: () => {
                  setActiveAvatar(matchedAvatar);
                  setCurrentView('chat');
                  setShowCameraModal(false);
                }
              }
            ]
          );
        } else {
          Alert.alert(
            'New Person Detected',
            'Would you like to create a new avatar for this person?',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Create Avatar', 
                onPress: () => {
                  setShowCameraModal(false);
                  setShowCreateModal(true);
                }
              }
            ]
          );
        }
      }, 1000);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Render Functions
  const renderAvatarsList = () => (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2', '#f093fb']}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Avatar Chat Studio</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setShowCameraModal(true)}
            >
              <Icon name="camera-alt" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setShowCreateModal(true)}
            >
              <Icon name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.avatarsList}>
          {avatars.map(avatar => (
            <TouchableOpacity
              key={avatar.id}
              style={styles.avatarCard}
              onPress={() => {
                setActiveAvatar(avatar);
                setCurrentView('chat');
              }}
            >
              <View style={styles.avatarInfo}>
                {avatar.image && (
                  <Image source={{ uri: avatar.image }} style={styles.avatarImage} />
                )}
                <View style={styles.avatarText}>
                  <Text style={styles.avatarName}>{avatar.name}</Text>
                  <Text style={styles.avatarDescription}>
                    {avatar.description || 'No description'}
                  </Text>
                  <View style={styles.avatarStats}>
                    <Text style={styles.statText}>{avatar.documents.length} docs</Text>
                    <Text style={styles.statText}>{avatar.images.length} images</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => deleteAvatar(avatar.id)}
              >
                <Icon name="delete" size={20} color="#ff6b6b" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );

  const renderChat = () => (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2', '#f093fb']}
        style={styles.gradient}
      >
        <View style={styles.chatHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setCurrentView('avatars')}
          >
            <Icon name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.chatTitle}>{activeAvatar?.name}</Text>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={handleFileUpload}
          >
            <Icon name="attach-file" size={24} color="white" />
          </TouchableOpacity>
        </View>

        <View style={styles.fileInfo}>
          <View style={styles.fileStats}>
            <Text style={styles.fileStatText}>
              📄 {activeAvatar?.documents.length || 0} Documents
            </Text>
            <Text style={styles.fileStatText}>
              🖼️ {activeAvatar?.images.length || 0} Images
            </Text>
          </View>
        </View>

        <ScrollView style={styles.messagesList}>
          {(messages[activeAvatar?.id] || []).map(message => (
            <View
              key={message.id}
              style={[
                styles.messageContainer,
                message.sender === 'user' ? styles.userMessage : 
                message.sender === 'system' ? styles.systemMessage : styles.avatarMessage
              ]}
            >
              <Text style={styles.messageText}>{message.content}</Text>
              {message.isVoice && (
                <View style={styles.voiceIndicator}>
                  <Icon name="mic" size={12} color="white" />
                  <Text style={styles.voiceText}>Voice Message</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.inputContainer}
        >
          <TextInput
            style={styles.messageInput}
            value={inputMessage}
            onChangeText={setInputMessage}
            placeholder="Type your message..."
            placeholderTextColor="rgba(255,255,255,0.7)"
            multiline
          />
          <TouchableOpacity
            style={[styles.voiceButton, isRecording && styles.recordingButton]}
            onPress={isRecording ? stopRecording : startRecording}
          >
            <Icon name={isRecording ? "stop" : "mic"} size={20} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.sendButton}
            onPress={sendMessage}
          >
            <Icon name="send" size={20} color="white" />
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );

  const renderCamera = () => (
    <Modal visible={showCameraModal} animationType="slide">
      <View style={styles.cameraContainer}>
        <RNCamera
          ref={cameraRef}
          style={styles.camera}
          type={RNCamera.Constants.Type.back}
          flashMode={RNCamera.Constants.FlashMode.auto}
          androidCameraPermissionOptions={{
            title: 'Permission to use camera',
            message: 'We need your permission to use your camera',
            buttonPositive: 'Ok',
            buttonNegative: 'Cancel',
          }}
        >
          <View style={styles.cameraOverlay}>
            <View style={styles.cameraHeader}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowCameraModal(false)}
              >
                <Icon name="close" size={30} color="white" />
              </TouchableOpacity>
              <Text style={styles.cameraTitle}>Find Avatar</Text>
              <View style={{ width: 40 }} />
            </View>
            
            <View style={styles.scanArea}>
              <View style={styles.scanFrame} />
              <Text style={styles.scanText}>
                Point camera at a person to detect existing avatar
              </Text>
            </View>

            <View style={styles.cameraControls}>
              <TouchableOpacity
                style={styles.captureButton}
                onPress={takePicture}
              >
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
            </View>
          </View>
        </RNCamera>
      </View>
    </Modal>
  );

  const renderCreateModal = () => (
    <Modal visible={showCreateModal} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Create New Avatar</Text>
          
          {capturedImage && (
            <Image source={{ uri: capturedImage }} style={styles.previewImage} />
          )}
          
          <TextInput
            style={styles.modalInput}
            value={newAvatarName}
            onChangeText={setNewAvatarName}
            placeholder="Avatar Name"
            placeholderTextColor="rgba(255,255,255,0.7)"
          />
          
          <TextInput
            style={[styles.modalInput, styles.textArea]}
            value={newAvatarDescription}
            onChangeText={setNewAvatarDescription}
            placeholder="Avatar Description (optional)"
            placeholderTextColor="rgba(255,255,255,0.7)"
            multiline
          />
          
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => {
                setShowCreateModal(false);
                setCapturedImage(null);
                setNewAvatarName('');
                setNewAvatarDescription('');
              }}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalButton, styles.createButton]}
              onPress={() => createAvatar(capturedImage)}
            >
              <Text style={styles.buttonText}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <>
      <StatusBar barStyle="light-content" />
      {currentView === 'avatars' && renderAvatarsList()}
      {currentView === 'chat' && renderChat()}
      {renderCamera()}
      {renderCreateModal()}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  headerButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 10,
    borderRadius: 20,
  },
  avatarsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  avatarCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  avatarText: {
    flex: 1,
  },
  avatarName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  avatarDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 5,
  },
  avatarStats: {
    flexDirection: 'row',
    gap: 15,
  },
  statText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  deleteButton: {
    padding: 10,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  backButton: {
    padding: 5,
  },
  chatTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  uploadButton: {
    padding: 5,
  },
  fileInfo: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  fileStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  fileStatText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  messagesList: {
    flex: 1,
    padding: 15,
  },
  messageContainer: {
    marginBottom: 10,
    padding: 12,
    borderRadius: 15,
    maxWidth: '80%',
  },
  userMessage: {
    backgroundColor: 'rgba(100,200,255,0.8)',
    alignSelf: 'flex-end',
  },
  avatarMessage: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'flex-start',
  },
  systemMessage: {
    backgroundColor: 'rgba(255,200,100,0.3)',
    alignSelf: 'center',
  },
  messageText: {
    color: 'white',
    fontSize: 16,
  },
  voiceIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    gap: 5,
  },
  voiceText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  messageInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    color: 'white',
    maxHeight: 100,
    marginRight: 10,
  },
  voiceButton: {
    backgroundColor: '#9b59b6',
    padding: 12,
    borderRadius: 20,
    marginRight: 10,
  },
  recordingButton: {
    backgroundColor: '#e74c3c',
  },
  sendButton: {
    backgroundColor: '#3498db',
    padding: 12,
    borderRadius: 20,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  closeButton: {
    padding: 5,
  },
  cameraTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: '#00ff00',
    borderRadius: 10,
  },
  scanText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 40,
  },
  cameraControls: {
    alignItems: 'center',
    paddingBottom: 50,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'white',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'rgba(100,100,200,0.9)',
    borderRadius: 20,
    padding: 20,
    width: width * 0.9,
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 20,
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    padding: 15,
    color: 'white',
    marginBottom: 15,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255,100,100,0.8)',
  },
  createButton: {
    backgroundColor: 'rgba(100,200,100,0.8)',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AvatarChatApp;