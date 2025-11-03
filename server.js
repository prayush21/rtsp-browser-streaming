const express = require("express");
const http = require("http");
const { spawn } = require("child_process");
const path = require("path");

// Create Express app
const app = express();
const server = http.createServer(app);

// Serve static files from the public directory
app.use(express.static("public"));

// Configuration
const PORT = 8000;

// Alternative RTSP URLs to try (uncomment one):
// const RTSP_URL = "rtsp://rtsp.stream/pattern"; // Test pattern stream
// const RTSP_URL = "rtsp://localhost:8554/mystream"; // Local RTSP server (if you have one)

// For testing without RTSP, we'll generate a test video file
const USE_TEST_VIDEO = true; // Set to false when using real RTSP
const TEST_VIDEO_PATH = "public/test-video.mp4";
const RTSP_URL = USE_TEST_VIDEO
  ? TEST_VIDEO_PATH
  : "rtsp://rtsp.stream/pattern";

const OUTPUT_PATH = "public/streams/stream.m3u8";

// FFmpeg process variable
let ffmpegProcess = null;

// Spawn FFmpeg process to convert RTSP to HLS
function startFFmpegStream() {
  console.log("Starting FFmpeg stream...");
  console.log(`Input: ${RTSP_URL}`);
  console.log(`Output: ${OUTPUT_PATH}`);

  const ffmpegArgs = [
    "-i",
    RTSP_URL,
    "-fflags",
    "flush_packets",
    "-max_delay",
    "2",
    "-an",
    "-flags",
    "-global_header",
    "-hls_time",
    "2",
    "-hls_list_size",
    "3",
    "-hls_flags",
    "delete_segments",
    "-vcodec",
    "copy",
    "-y",
    OUTPUT_PATH,
  ];

  ffmpegProcess = spawn("ffmpeg", ffmpegArgs);

  // Listen to stdout
  ffmpegProcess.stdout.on("data", (data) => {
    console.log(`FFmpeg stdout: ${data}`);
  });

  // Listen to stderr (FFmpeg outputs most info to stderr)
  ffmpegProcess.stderr.on("data", (data) => {
    console.log(`FFmpeg: ${data}`);
  });

  // Listen to process close
  ffmpegProcess.on("close", (code) => {
    console.log(`FFmpeg process exited with code ${code}`);
    ffmpegProcess = null;
  });

  // Listen to process error
  ffmpegProcess.on("error", (err) => {
    console.error(`FFmpeg error: ${err.message}`);
    console.error("Make sure FFmpeg is installed and accessible in your PATH");
  });
}

// Start the server
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log("Starting FFmpeg stream transcoding...");
  startFFmpegStream();
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down gracefully...");
  if (ffmpegProcess) {
    console.log("Killing FFmpeg process...");
    ffmpegProcess.kill("SIGINT");
  }
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
