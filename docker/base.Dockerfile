# syntax=docker/dockerfile:1

# ─── SpikeClip Base Image ───
# Pre-installed with ffmpeg, python3, yt-dlp, pnpm for fast builds
FROM node:22-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    ffmpeg \
    python3 \
    py3-pip \
    curl

# Install yt-dlp
RUN pip3 install --break-system-packages yt-dlp

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate