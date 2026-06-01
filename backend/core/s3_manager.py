import os
import boto3
import urllib.request
from botocore.exceptions import ClientError
from urllib.error import URLError

class S3Manager:
    """
    Manages all interactions with AWS S3 for the ReciFit app.
    """
    def __init__(self, bucket_name=None):
        self.s3_client = boto3.client('s3')
        # Expect the bucket name to be provided via environment variable, strip trailing spaces!
        raw_bucket_name = bucket_name or os.environ.get('RECIPES_BUCKET_NAME', 'recifit-cookbook-images')
        self.bucket_name = raw_bucket_name.strip()
        
    def upload_image_from_url(self, image_url, object_name):
        """
        Downloads an image from a URL (e.g., from DALL-E) and uploads it directly to S3.
        """
        try:
            req = urllib.request.Request(image_url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=30) as response:
                image_data = response.read()
                
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=object_name,
                Body=image_data,
                ContentType='image/png'
            )
            return True
            
        except URLError as e:
            print(f"Failed to download image from {image_url}: {e}")
            raise Exception(f"Image download failed: {e}")
        except ClientError as e:
            print(f"Failed to upload image to S3: {e}")
            raise Exception(f"S3 upload failed: {e}")
            
    def get_presigned_url(self, object_name, expiration=3600):
        """
        Generates a secure presigned URL to view the image.
        """
        try:
            response = self.s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': object_name
                },
                ExpiresIn=expiration
            )
            return response
        except ClientError as e:
            print(f"Failed to generate presigned URL for {object_name}: {e}")
            raise Exception(f"Failed to generate image URL: {e}")

    def upload_json(self, json_data, object_name):
        """
        Uploads a Python dictionary as a JSON file to S3.
        """
        import json
        try:
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=object_name,
                Body=json.dumps(json_data),
                ContentType='application/json'
            )
            return True
        except ClientError as e:
            print(f"Failed to upload JSON to S3: {e}")
            raise Exception(f"S3 JSON upload failed: {e}")
