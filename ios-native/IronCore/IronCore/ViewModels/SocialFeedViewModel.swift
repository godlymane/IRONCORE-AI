import Foundation
import FirebaseFirestore
import FirebaseAuth
import FirebaseStorage
import UIKit

/// Social feed — global activity feed, community chat, posts, inbox, following.
/// Mirrors CommunityView.jsx + useFitnessData.js social listeners from React prototype.
/// Firestore collections: global/data/chat, global/data/posts, global/data/feed,
///   users/{uid}/inbox, users/{uid}/following
@MainActor
final class SocialFeedViewModel: ObservableObject {

    // MARK: - Published State

    @Published var selectedTab: SocialTab = .feed

    // Activity feed (global/data/feed)
    @Published var activityFeed: [FeedEvent] = []

    // Community chat (global/data/chat — "Locker Room")
    @Published var chatMessages: [ChatMessage] = []
    @Published var chatInput = ""

    // Posts (global/data/posts — progress photos)
    @Published var posts: [Post] = []
    @Published var showNewPost = false
    @Published var newPostCaption = ""
    @Published var newPostImage: UIImage?
    @Published var isUploadingPost = false

    // Inbox (users/{uid}/inbox)
    @Published var inbox: [InboxMessage] = []

    // Following (users/{uid}/following)
    @Published var following: Set<String> = []

    // Player detail
    @Published var selectedPlayer: LeaderboardPlayer?
    @Published var showPlayerDetail = false

    @Published var dataLoaded = false

    private let db = Firestore.firestore()
    private let storage = Storage.storage()
    private var listeners: [ListenerRegistration] = []

    // MARK: - Data Models

    enum SocialTab: String, CaseIterable, Identifiable {
        case feed = "Feed"
        case chat = "Locker"
        case posts = "Media"
        case inbox = "Inbox"

        var id: String { rawValue }

        var icon: String {
            switch self {
            case .feed: return "bolt.fill"
            case .chat: return "bubble.left.fill"
            case .posts: return "photo.fill"
            case .inbox: return "envelope.fill"
            }
        }
    }

    struct FeedEvent: Identifiable {
        let id: String
        let type: String
        let message: String
        let details: String
        let username: String
        let userId: String
        let createdAt: Date?
    }

    struct ChatMessage: Identifiable {
        let id: String
        let text: String
        let userId: String
        let username: String
        let photo: String
        let xp: Int
        let createdAt: Date?
    }

    struct Post: Identifiable {
        let id: String
        let imageUrl: String
        let caption: String
        let userId: String
        let username: String
        let userPhoto: String
        let xp: Int
        let likes: Int
        let createdAt: Date?
    }

    struct InboxMessage: Identifiable {
        let id: String
        let text: String
        let fromId: String
        let fromName: String
        let fromPhoto: String
        let createdAt: Date?
        let read: Bool
    }

    struct LeaderboardPlayer: Identifiable {
        let id: String
        let username: String
        let xp: Int
        let photo: String
        let todayVolume: Int
    }

    // MARK: - Start Listening

    func startListening(uid: String) {
        // Activity feed — global/data/feed (last 50, descending)
        let feedListener = db.collection("global").document("data")
            .collection("feed")
            .order(by: "createdAt", descending: true)
            .limit(to: 50)
            .addSnapshotListener { [weak self] snapshot, error in
                guard let self, error == nil else { return }
                Task { @MainActor in
                    self.activityFeed = snapshot?.documents.compactMap { Self.parseFeedEvent($0) } ?? []
                }
            }
        listeners.append(feedListener)

        // Community chat — global/data/chat (last 50, ascending for display order)
        let chatListener = db.collection("global").document("data")
            .collection("chat")
            .order(by: "createdAt", descending: false)
            .limit(to: 50)
            .addSnapshotListener { [weak self] snapshot, error in
                guard let self, error == nil else { return }
                Task { @MainActor in
                    self.chatMessages = snapshot?.documents.compactMap { Self.parseChatMessage($0) } ?? []
                }
            }
        listeners.append(chatListener)

        // Posts — global/data/posts (last 50, descending)
        let postsListener = db.collection("global").document("data")
            .collection("posts")
            .order(by: "createdAt", descending: true)
            .limit(to: 50)
            .addSnapshotListener { [weak self] snapshot, error in
                guard let self, error == nil else { return }
                Task { @MainActor in
                    self.posts = snapshot?.documents.compactMap { Self.parsePost($0) } ?? []
                }
            }
        listeners.append(postsListener)

        // Inbox — users/{uid}/inbox (last 50, descending)
        let inboxListener = db.collection("users").document(uid)
            .collection("inbox")
            .order(by: "createdAt", descending: true)
            .limit(to: 50)
            .addSnapshotListener { [weak self] snapshot, error in
                guard let self, error == nil else { return }
                Task { @MainActor in
                    self.inbox = snapshot?.documents.compactMap { Self.parseInboxMessage($0) } ?? []
                }
            }
        listeners.append(inboxListener)

        // Following — users/{uid}/following
        let followingListener = db.collection("users").document(uid)
            .collection("following")
            .addSnapshotListener { [weak self] snapshot, error in
                guard let self, error == nil else { return }
                Task { @MainActor in
                    self.following = Set(snapshot?.documents.map(\.documentID) ?? [])
                    self.dataLoaded = true
                }
            }
        listeners.append(followingListener)
    }

    func stopListening() {
        listeners.forEach { $0.remove() }
        listeners.removeAll()
    }

    // MARK: - Parse Firestore Documents

    private static func parseFeedEvent(_ doc: QueryDocumentSnapshot) -> FeedEvent {
        let data = doc.data()
        return FeedEvent(
            id: doc.documentID,
            type: data["type"] as? String ?? "",
            message: data["message"] as? String ?? "",
            details: data["details"] as? String ?? "",
            username: data["username"] as? String ?? "Unknown",
            userId: data["userId"] as? String ?? "",
            createdAt: (data["createdAt"] as? Timestamp)?.dateValue()
        )
    }

    private static func parseChatMessage(_ doc: QueryDocumentSnapshot) -> ChatMessage {
        let data = doc.data()
        return ChatMessage(
            id: doc.documentID,
            text: data["text"] as? String ?? "",
            userId: data["userId"] as? String ?? "",
            username: data["username"] as? String ?? "Unknown",
            photo: data["photo"] as? String ?? "",
            xp: (data["xp"] as? Int) ?? Int(data["xp"] as? Double ?? 0),
            createdAt: (data["createdAt"] as? Timestamp)?.dateValue()
        )
    }

    private static func parsePost(_ doc: QueryDocumentSnapshot) -> Post {
        let data = doc.data()
        return Post(
            id: doc.documentID,
            imageUrl: data["imageUrl"] as? String ?? "",
            caption: data["caption"] as? String ?? "",
            userId: data["userId"] as? String ?? "",
            username: data["username"] as? String ?? "Unknown",
            userPhoto: data["userPhoto"] as? String ?? "",
            xp: (data["xp"] as? Int) ?? Int(data["xp"] as? Double ?? 0),
            likes: (data["likes"] as? Int) ?? Int(data["likes"] as? Double ?? 0),
            createdAt: (data["createdAt"] as? Timestamp)?.dateValue()
        )
    }

    private static func parseInboxMessage(_ doc: QueryDocumentSnapshot) -> InboxMessage {
        let data = doc.data()
        return InboxMessage(
            id: doc.documentID,
            text: data["text"] as? String ?? "",
            fromId: data["fromId"] as? String ?? "",
            fromName: data["fromName"] as? String ?? "Unknown",
            fromPhoto: data["fromPhoto"] as? String ?? "",
            createdAt: (data["createdAt"] as? Timestamp)?.dateValue(),
            read: data["read"] as? Bool ?? false
        )
    }

    // MARK: - Actions

    /// Send message to global chat (matches sendMessage in useFitnessData.js)
    func sendChatMessage(uid: String, username: String, photo: String, xp: Int) async {
        let text = chatInput.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty, text.count <= 500 else { return }
        chatInput = ""

        do {
            try await db.collection("global").document("data")
                .collection("chat").addDocument(data: [
                    "text": text,
                    "userId": uid,
                    "username": username,
                    "photo": photo,
                    "xp": xp,
                    "createdAt": FieldValue.serverTimestamp()
                ])
        } catch {
            print("[Social] Failed to send chat: \(error)")
        }
    }

    /// Create a post with image (matches createPost in useFitnessData.js)
    func createPost(uid: String, username: String, userPhoto: String, xp: Int) async {
        guard let image = newPostImage else { return }
        let caption = newPostCaption.prefix(300)
        isUploadingPost = true

        do {
            // Upload image to Firebase Storage
            let timestamp = Int(Date().timeIntervalSince1970)
            let path = "posts/\(timestamp)_\(uid).jpg"
            guard let imageData = image.jpegData(compressionQuality: 0.7) else {
                isUploadingPost = false
                return
            }

            let ref = storage.reference().child(path)
            _ = try await ref.putDataAsync(imageData)
            let downloadURL = try await ref.downloadURL()

            // Create post document
            try await db.collection("global").document("data")
                .collection("posts").addDocument(data: [
                    "imageUrl": downloadURL.absoluteString,
                    "caption": String(caption),
                    "userId": uid,
                    "username": username,
                    "userPhoto": userPhoto,
                    "xp": xp,
                    "likes": 0,
                    "createdAt": FieldValue.serverTimestamp()
                ])

            newPostCaption = ""
            newPostImage = nil
            showNewPost = false
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        } catch {
            print("[Social] Failed to create post: \(error)")
        }
        isUploadingPost = false
    }

    /// Toggle follow user (matches toggleFollow in useFitnessData.js)
    func toggleFollow(uid: String, targetUserId: String) async {
        let ref = db.collection("users").document(uid)
            .collection("following").document(targetUserId)

        do {
            if following.contains(targetUserId) {
                try await ref.delete()
            } else {
                try await ref.setData(["followedAt": FieldValue.serverTimestamp()])
            }
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
        } catch {
            print("[Social] Failed to toggle follow: \(error)")
        }
    }

    /// Send private message (matches sendPrivateMessage in useFitnessData.js)
    func sendPrivateMessage(fromUid: String, fromName: String, fromPhoto: String, toUid: String, text: String) async {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, trimmed.count <= 500 else { return }

        do {
            try await db.collection("users").document(toUid)
                .collection("inbox").addDocument(data: [
                    "text": trimmed,
                    "fromId": fromUid,
                    "fromName": fromName,
                    "fromPhoto": fromPhoto,
                    "createdAt": FieldValue.serverTimestamp(),
                    "read": false
                ])
        } catch {
            print("[Social] Failed to send message: \(error)")
        }
    }

    /// Broadcast event to global feed (matches broadcastEvent in useFitnessData.js)
    func broadcastEvent(uid: String, username: String, type: String, message: String, details: String) async {
        do {
            try await db.collection("global").document("data")
                .collection("feed").addDocument(data: [
                    "type": type,
                    "message": message,
                    "details": details,
                    "username": username,
                    "userId": uid,
                    "createdAt": FieldValue.serverTimestamp()
                ])
        } catch {
            print("[Social] Failed to broadcast: \(error)")
        }
    }

    /// Like a post — increments likes counter (matches React posts structure)
    func likePost(_ postId: String) async {
        do {
            try await db.collection("global").document("data")
                .collection("posts").document(postId).updateData([
                    "likes": FieldValue.increment(Int64(1))
                ])
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
        } catch {
            print("[Social] Failed to like post: \(error)")
        }
    }

    // MARK: - Helpers

    func levelForXP(_ xp: Int) -> Int {
        max(1, xp / 500 + 1)
    }

    func timeAgo(_ date: Date?) -> String {
        guard let date else { return "" }
        let seconds = Int(Date().timeIntervalSince(date))
        if seconds < 60 { return "now" }
        if seconds < 3600 { return "\(seconds / 60)m" }
        if seconds < 86400 { return "\(seconds / 3600)h" }
        return "\(seconds / 86400)d"
    }
}
