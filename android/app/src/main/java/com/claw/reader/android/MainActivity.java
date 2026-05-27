package com.claw.reader.android;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import java.io.*;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "ClawReader";
    private Intent pendingShareIntent;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        handleShareIntent(getIntent());
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleShareIntent(intent);
    }

    private void handleShareIntent(Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if (action == null) return;

        boolean isSend = Intent.ACTION_SEND.equals(action);
        boolean isSendMultiple = Intent.ACTION_SEND_MULTIPLE.equals(action);
        boolean isView = Intent.ACTION_VIEW.equals(action);
        if (!isSend && !isSendMultiple && !isView) return;

        Log.d(TAG, "handleShareIntent: action=" + action + ", type=" + intent.getType());

        // Get file URI
        Uri uri = null;
        if (isSend) {
            uri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
        } else if (isSendMultiple) {
            // For multiple files, take only the first one
            java.util.ArrayList<Uri> uris = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
            if (uris != null && !uris.isEmpty()) uri = uris.get(0);
        } else {
            uri = intent.getData();
        }
        if (uri == null) {
            Log.w(TAG, "No URI found in intent");
            return;
        }
        Log.d(TAG, "File URI: " + uri.toString() + ", scheme: " + uri.getScheme());

        pendingShareIntent = intent;
        Uri finalUri = uri;

        // Try injecting immediately, or defer until WebView is ready
        if (getBridge() != null && getBridge().getWebView() != null) {
            processSharedFile(finalUri, intent);
        } else {
            // WebView not ready — retry on resume
            Log.d(TAG, "WebView not ready, deferring...");
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        if (pendingShareIntent != null && getBridge() != null && getBridge().getWebView() != null) {
            Intent intent = pendingShareIntent;
            pendingShareIntent = null;
            Uri uri = getShareUri(intent);
            if (uri != null) {
                getBridge().getWebView().postDelayed(() -> processSharedFile(uri, intent), 500);
            }
        }
    }

    private Uri getShareUri(Intent intent) {
        if (Intent.ACTION_SEND.equals(intent.getAction())) {
            return intent.getParcelableExtra(Intent.EXTRA_STREAM);
        }
        return intent.getData();
    }

    private void processSharedFile(Uri uri, Intent intent) {
        String fileName = resolveFileName(uri, intent);
        Log.d(TAG, "Processing shared file: " + fileName + ", scheme=" + uri.getScheme());

        try {
            InputStream in = getContentResolver().openInputStream(uri);
            
            // Fallback for file:// URIs
            if (in == null && "file".equals(uri.getScheme())) {
                String path = uri.getPath();
                if (path != null) {
                    in = new FileInputStream(new java.io.File(path));
                }
            }
            
            if (in == null) {
                Log.e(TAG, "Cannot open input stream for URI: " + uri);
                return;
            }

            String content;
            try {
                content = readTextContent(in);
            } finally {
                in.close();
            }

            // Escape for JS injection
            String escaped = escapeJsString(content);
            String escapedName = escapeJsString(fileName);

            // Inject file data into WebView
            String js = "window.__clawShared__ = { name: '" + escapedName
                + "', content: '" + escaped + "' };"
                + "window.dispatchEvent(new CustomEvent('clawreader:sharedFile', { detail: window.__clawShared__ }));";

            getBridge().getWebView().evaluateJavascript(js, result ->
                Log.d(TAG, "JS injection result: " + result));

            Log.d(TAG, "Shared file injected: " + fileName + " (" + content.length() + " chars)");

        } catch (Exception e) {
            Log.e(TAG, "Failed to handle shared file", e);
            String errJs = "window.__shareError__ = '" + escapeJsString(e.getMessage()) + "';"
                + "alert('无法读取文件: " + escapeJsString(e.getMessage()) + "')";
            try {
                getBridge().getWebView().evaluateJavascript(errJs, null);
            } catch (Exception ignored) {}
        }
    }

    private String resolveFileName(Uri uri, Intent intent) {
        // Try content resolver DISPLAY_NAME
        try (android.database.Cursor cursor = getContentResolver().query(uri, null, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int idx = cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME);
                if (idx >= 0) {
                    String name = cursor.getString(idx);
                    if (name != null && !name.isEmpty()) return name;
                }
            }
        } catch (Exception ignored) {}

        // Try intent subject
        CharSequence subject = intent.getCharSequenceExtra(Intent.EXTRA_SUBJECT);
        if (subject != null && subject.length() > 0) {
            String s = subject.toString();
            // If it looks like a filename, use it
            if (s.contains(".") && s.length() < 200) return s;
        }

        // Try intent TITLE
        CharSequence title = intent.getCharSequenceExtra(Intent.EXTRA_TITLE);
        if (title != null && title.length() > 0) {
            String s = title.toString();
            if (s.contains(".") && s.length() < 200) return s;
        }

        // Fallback: derive from URI path
        String path = uri.getLastPathSegment();
        if (path != null && path.contains(".")) return path;

        return "shared_file.txt";
    }

    private String readTextContent(InputStream in) throws IOException {
        StringBuilder sb = new StringBuilder();
        // Try UTF-8 first
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(in, "UTF-8"))) {
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line).append("\n");
            }
        } catch (Exception e) {
            // Fallback: read as raw bytes
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int len;
            while ((len = in.read(buf)) > 0) {
                baos.write(buf, 0, len);
            }
            String raw = baos.toString("UTF-8");
            sb.append(raw);
        }
        // Limit to 2MB to avoid JS injection issues
        if (sb.length() > 2_000_000) {
            sb.setLength(2_000_000);
            sb.append("\n... (内容已截断)");
        }
        return sb.toString();
    }

    private String escapeJsString(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\")
                .replace("'", "\\'")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t")
                .replace("\"", "\\\"");
    }
}