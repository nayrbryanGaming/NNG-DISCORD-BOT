#!/usr/bin/env python3
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from instagrapi import Client

# Config
DATA_FILE = Path(__file__).parent.parent / "data" / "last-posts.json"
WEBHOOK_CONFIG = json.loads(os.environ.get("WEBHOOK_CONFIG", "[]"))

# Load last posts
last_posts = {}
try:
    if DATA_FILE.exists():
        last_posts = json.load(open(DATA_FILE))
except:
    pass

print("🚀 Instagram Checker v6 (Instagrapi)")
print(f"⏰ {datetime.utcnow().isoformat()}\n")

def send_to_discord(webhook_url, username, post):
    """Send notification to Discord webhook"""
    import requests
    
    try:
        payload = {
            "username": "Instagram Notifier",
            "avatar_url": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Instagram_icon.png/240px-Instagram_icon.png",
            "embeds": [{
                "title": f"🆕 New Post from @{username}",
                "description": (post.caption[:300] + "...") if post.caption and len(post.caption) > 300 else (post.caption or f"New post from @{username}"),
                "url": f"https://www.instagram.com/p/{post.code}/",
                "image": {"url": post.media_type == 1 and post.image_versions2.candidates[0].url or ""},
                "color": 0xE4405F,
                "timestamp": datetime.fromisoformat(str(post.taken_at)).isoformat(),
                "footer": {"text": "Instagram Auto-Checker • Every 4 hours"}
            }]
        }
        
        response = requests.post(webhook_url, json=payload)
        if response.status_code == 204:
            return True
    except Exception as e:
        print(f"   ❌ Discord webhook error: {e}")
    
    return False

def check_instagram(username, webhook_url):
    """Check Instagram account for new posts"""
    print(f"📱 Checking @{username}...")
    
    try:
        # Create client (anonymous, no login needed for public profiles)
        client = Client()
        
        # Get user info
        try:
            user = client.user_info_by_username(username)
        except Exception as e:
            print(f"   ⚠️ User not found or private: {e}\n")
            return
        
        # Get user's posts
        try:
            posts = client.user_medias(user.pk, amount=1)
        except Exception as e:
            print(f"   ⚠️ Could not fetch posts: {e}\n")
            return
        
        if not posts:
            print(f"   ⚠️ No posts found\n")
            return
        
        post = posts[0]
        post_id = post.id
        
        is_first_run = username not in last_posts
        last_post_id = last_posts.get(username)
        
        if is_first_run or last_post_id != post_id:
            if is_first_run:
                print(f"   🆕 FIRST RUN - Sending latest post!")
            else:
                print(f"   🆕 NEW POST FOUND!")
            
            print(f"      URL: https://www.instagram.com/p/{post.code}/\n")
            
            if send_to_discord(webhook_url, username, post):
                print(f"   ✓ Notified Discord!\n")
                last_posts[username] = post_id
            else:
                print(f"   ❌ Failed to notify Discord\n")
        else:
            print(f"   ✓ No new posts\n")
        
        time.sleep(2)
        
    except Exception as e:
        print(f"   ❌ Error: {e}\n")

def main():
    """Main function"""
    for config in WEBHOOK_CONFIG:
        username = config.get("username")
        webhook = config.get("webhook")
        
        if username and webhook:
            check_instagram(username, webhook)
    
    # Save last posts
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(DATA_FILE, "w") as f:
        json.dump(last_posts, f, indent=2)
    
    print("✅ Done!")

if __name__ == "__main__":
    main()
