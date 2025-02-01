# O2 TV IPTV Server
⚠ This project is not affiliated with O2 TV. It is an unofficial project that is developed and maintained by the community.

[![Build & Publish Docker Image to Docker Hub](https://github.com/goodbyepavlyi/o2tv-iptvserver/actions/workflows/docker-image.yml/badge.svg)](https://github.com/goodbyepavlyi/o2tv-iptvserver/actions/workflows/docker-image.yml)
![GitHub Stars](https://img.shields.io/github/stars/goodbyepavlyi/o2tv-iptvserver)

<p align="center">
  <img src="./assets/ui.png" width="802" />
</p>

Simple and lightweight IPTV server that allows you to watch live TV channels from O2 TV on your device. It allows to play multiple channels at the same time and supports multiple clients even if you don't have the subscription for it.

## Installation

**Note**: Before proceeding, ensure that Docker is installed on your system.

#### 1. Download `docker-compose.yml` and `.env.example`:

```bash
curl -O https://raw.githubusercontent.com/goodbyepavlyi/o2tv-iptvserver/master/docker-compose.yml
curl -O https://raw.githubusercontent.com/goodbyepavlyi/o2tv-iptvserver/master/.env.example
```

#### 2. Configure the `.env` file:

Rename `.env.example` to `.env` and edit it with your credentials:

```bash
mv .env.example .env
nano .env  # Or use your preferred text editor
```

#### 3. Start the container:

```bash
docker compose up -d
```

## Update

To keep your O2 TV IPTV Server up to date, follow these steps:

#### 1. Pull the Latest Docker Image

```bash
docker-compose pull
```

This command will fetch the latest version of the O2 TV IPTV Server Docker image from the Docker Hub.


#### 2. Restart the Container
```
docker-compose up -d
```

By running this command, you'll restart the O2 TV IPTV Server container with the latest image. Your server will now be running the most recent version.

That's it! Your O2 TV IPTV Server is now updated and ready to go. Enjoy the latest features and improvements.

# Contributing
All contributions are welcome! Please feel free to open a new issue or submit a pull request.