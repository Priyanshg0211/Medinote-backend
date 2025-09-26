const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

class SupabaseService {
  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL || 'https://jjoqsxxwsltnwlllbgqd.supabase.co';
    this.supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impqb3FzeHh3c2x0bndsbGxiZ3FkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5MDc0NDYsImV4cCI6MjA3NDQ4MzQ0Nn0.uAP4M5OKOzT2VK2KmJAR6VFOjB0vLfdIqprNijavrUg';
    this.bucketName = process.env.STORAGE_BUCKET_NAME || 'medinote-audio-files';
    
    this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
  }

  // Generate presigned URL for audio upload
  async generatePresignedUrl(fileName, mimeType) {
    try {
      const filePath = `sessions/${fileName}`;
      
      // Create a signed URL for upload (valid for 15 minutes)
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .createSignedUploadUrl(filePath);

      if (error) {
        throw new Error(`Failed to create presigned URL: ${error.message}`);
      }

      return {
        url: data.signedUrl,
        gcsPath: filePath,
        publicUrl: `${this.supabaseUrl}/storage/v1/object/public/${this.bucketName}/${filePath}`
      };
    } catch (error) {
      console.error('Error generating presigned URL:', error);
      throw error;
    }
  }

  // Get public URL for uploaded file
  async getPublicUrl(fileName) {
    try {
      const filePath = `sessions/${fileName}`;
      const { data } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);
      
      return data.publicUrl;
    } catch (error) {
      console.error('Error getting public URL:', error);
      throw error;
    }
  }

  // Upload file directly to Supabase storage
  async uploadFile(fileName, fileBuffer, mimeType) {
    try {
      const filePath = `sessions/${fileName}`;
      
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(filePath, fileBuffer, {
          contentType: mimeType,
          upsert: true
        });

      if (error) {
        throw new Error(`Failed to upload file: ${error.message}`);
      }

      return {
        path: data.path,
        publicUrl: `${this.supabaseUrl}/storage/v1/object/public/${this.bucketName}/${data.path}`
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  // Delete file from storage
  async deleteFile(fileName) {
    try {
      const filePath = `sessions/${fileName}`;
      
      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        throw new Error(`Failed to delete file: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  // Database operations
  async query(sql, params = []) {
    try {
      const { data, error } = await this.supabase.rpc('execute_sql', {
        sql_query: sql,
        params: params
      });

      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  // Insert data into table
  async insert(table, data) {
    try {
      const { data: result, error } = await this.supabase
        .from(table)
        .insert(data)
        .select();

      if (error) {
        throw new Error(`Insert failed: ${error.message}`);
      }

      return result;
    } catch (error) {
      console.error('Insert error:', error);
      throw error;
    }
  }

  // Update data in table
  async update(table, data, filter) {
    try {
      const { data: result, error } = await this.supabase
        .from(table)
        .update(data)
        .match(filter)
        .select();

      if (error) {
        throw new Error(`Update failed: ${error.message}`);
      }

      return result;
    } catch (error) {
      console.error('Update error:', error);
      throw error;
    }
  }

  // Select data from table
  async select(table, filter = {}) {
    try {
      let query = this.supabase.from(table).select('*');
      
      // Apply filters
      Object.keys(filter).forEach(key => {
        query = query.eq(key, filter[key]);
      });

      const { data, error } = await query;

      if (error) {
        throw new Error(`Select failed: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Select error:', error);
      throw error;
    }
  }
}

module.exports = new SupabaseService();
