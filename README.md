# O2 TV IPTV Server

[![Build & Publish Docker Image to Docker Hub](https://github.com/goodbyepavlyi/o2tv-iptvserver/actions/workflows/docker-image.yml/badge.svg?branch=production)](https://github.com/goodbyepavlyi/o2tv-iptvserver/actions/workflows/docker-image.yml)
[![Docker](https://img.shields.io/docker/v/goodbyepavlyi/o2tv-iptvserver/latest)](https://hub.docker.com/r/goodbyepavlyi/o2tv-iptvserver)
[![Docker](https://img.shields.io/docker/pulls/goodbyepavlyi/o2tv-iptvserver.svg)](https://hub.docker.com/r/goodbyepavlyi/o2tv-iptvserver)
![GitHub Stars](https://img.shields.io/github/stars/goodbyepavlyi/o2tv-iptvserver)

<p align="center">
  <img src="./assets/ui.png" width="802" />
</p>

## Requirements

* A host with Docker installed.

## Installation

### 1. Install Docker

### 2. Run the container

To automatically install & run the container, simply download the docker-compose.yml and run `docker-compose up -d`

<pre>
version: "3.8"

services:
  o2tv-iptvserver:
    container_name: "o2tv-iptvserver"
    image: "goodbyepavlyi/o2tv-iptvserver:latest"
    environment:
      # ⚠️ Required:
      # Change this to your host's public address
      URL: "http://<IP_ADDRESS>:<PORT>"
      # Enter your O2 TV credentials
      O2TV_EMAIL: "example@gmail.com"
      O2TV_PASSWORD: "changeme"

      # Optional
      # PORT: "8649"
      # CONFIG_PATH: "/config/config.conf"
    volumes:
      - "./o2tv-iptvserver:/config"
    ports:
      - "8649:8649"
    restart: "unless-stopped"
</pre>

> You have to replace the URL, O2TV_EMAIL, O2TV_PASSWORD variables.