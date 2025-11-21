#!/usr/bin/env python3
"""
Script to decode email fixtures from JSON format and extract actual content.
Decodes base64-encoded email bodies and saves them as readable HTML and text files.
"""

import base64
import json
import os
from pathlib import Path


def decode_base64_content(data):
    """Decode base64 encoded email content."""
    if not data:
        return ""
    try:
        # Gmail API uses URL-safe base64 encoding
        # Add padding if necessary
        missing_padding = len(data) % 4
        if missing_padding:
            data += '=' * (4 - missing_padding)
        decoded = base64.urlsafe_b64decode(data)
        return decoded.decode('utf-8', errors='replace')
    except Exception as e:
        print(f"Error decoding: {e}")
        try:
            # Try standard base64 as fallback
            decoded = base64.b64decode(data)
            return decoded.decode('utf-8', errors='replace')
        except:
            return ""


def extract_header_value(headers, name):
    """Extract a specific header value from the headers list."""
    for header in headers:
        if header.get('name', '').lower() == name.lower():
            return header.get('value', '')
    return ''


def process_part(part, email_dir, part_prefix=''):
    """Recursively process email parts, handling nested multipart structures."""
    mime_type = part.get('mimeType', '')
    part_id = part.get('partId', 'unknown')
    body_data = part.get('body', {}).get('data', '')
    filename = part.get('filename', '')
    nested_parts = part.get('parts', [])

    # If this part has nested parts (multipart), recurse into them
    if nested_parts:
        for nested_part in nested_parts:
            process_part(nested_part, email_dir, part_prefix)
        return

    # Process leaf parts with actual content
    if not body_data:
        return

    decoded_content = decode_base64_content(body_data)

    # Save based on MIME type
    if mime_type == 'text/plain':
        output_file = email_dir / f'body_part_{part_id}.txt'
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(decoded_content)
        print(f"  - Saved plain text: {output_file.name}")

    elif mime_type == 'text/html':
        output_file = email_dir / f'body_part_{part_id}.html'
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(decoded_content)
        print(f"  - Saved HTML: {output_file.name}")

    elif filename:
        # Handle attachments
        output_file = email_dir / f'attachment_{filename}'
        try:
            # Try to decode as base64 for binary attachments
            missing_padding = len(body_data) % 4
            if missing_padding:
                body_data += '=' * (4 - missing_padding)
            decoded_binary = base64.urlsafe_b64decode(body_data)
            with open(output_file, 'wb') as f:
                f.write(decoded_binary)
            print(f"  - Saved attachment: {output_file.name}")
        except Exception as e:
            print(f"  - Error saving attachment {filename}: {e}")


def process_email_file(json_path, output_dir):
    """Process a single email JSON file and extract its content."""
    with open(json_path, 'r', encoding='utf-8') as f:
        email_data = json.load(f)

    email_id = email_data.get('id', 'unknown')
    print(f"Processing: {email_id}")

    # Create output directory for this email
    email_dir = output_dir / email_id
    email_dir.mkdir(exist_ok=True)

    # Extract headers
    headers = email_data.get('payload', {}).get('headers', [])
    subject = extract_header_value(headers, 'Subject')
    from_addr = extract_header_value(headers, 'From')
    to_addr = extract_header_value(headers, 'To')
    date = extract_header_value(headers, 'Date')

    # Write metadata
    with open(email_dir / 'metadata.txt', 'w', encoding='utf-8') as f:
        f.write(f"Email ID: {email_id}\n")
        f.write(f"Subject: {subject}\n")
        f.write(f"From: {from_addr}\n")
        f.write(f"To: {to_addr}\n")
        f.write(f"Date: {date}\n")
        f.write(f"\n{'='*80}\n\n")

    # Extract body parts
    parts = email_data.get('payload', {}).get('parts', [])

    if not parts:
        # Email might have body directly in payload
        body_data = email_data.get('payload', {}).get('body', {}).get('data', '')
        if body_data:
            content = decode_base64_content(body_data)
            mime_type = email_data.get('payload', {}).get('mimeType', '')
            if 'html' in mime_type:
                with open(email_dir / 'body.html', 'w', encoding='utf-8') as f:
                    f.write(content)
            else:
                with open(email_dir / 'body.txt', 'w', encoding='utf-8') as f:
                    f.write(content)
    else:
        # Process all parts recursively
        for part in parts:
            process_part(part, email_dir)

    # Write full headers
    with open(email_dir / 'headers.txt', 'w', encoding='utf-8') as f:
        for header in headers:
            f.write(f"{header.get('name')}: {header.get('value')}\n")

    print(f"  ✓ Completed {email_id}\n")


def main():
    """Main function to process all email fixtures."""
    script_dir = Path(__file__).parent
    output_dir = script_dir / 'decoded'
    output_dir.mkdir(exist_ok=True)

    # Find all JSON email files (exclude index.json)
    json_files = sorted(script_dir.glob('*.json'))
    json_files = [f for f in json_files if f.name != 'index.json']

    print(f"Found {len(json_files)} email files to process\n")
    print("="*80)

    for json_file in json_files:
        try:
            process_email_file(json_file, output_dir)
        except Exception as e:
            print(f"Error processing {json_file.name}: {e}\n")

    print("="*80)
    print(f"\n✓ Decoding complete! Files saved to: {output_dir}")
    print(f"  Total emails processed: {len(json_files)}")


if __name__ == '__main__':
    main()
