FROM php:8.2-apache

ENV DEBIAN_FRONTEND=noninteractive

# Install required system tools, PHP extensions (SQLite, MySQL, PDO), FFmpeg, and Chromium rendering libs
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    gnupg \
    ca-certificates \
    unzip \
    libsqlite3-dev \
    libzip-dev \
    ffmpeg \
    chromium \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    && docker-php-ext-install pdo pdo_sqlite pdo_mysql \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Node.js 20 LTS
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Configure Puppeteer to use the installed system Chromium binary without downloading duplicate
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Enable Apache rewrite and headers modules
RUN a2enmod rewrite headers

# Configure Apache to listen on Google Cloud Run $PORT (defaults to 8080)
RUN sed -i 's/80/${PORT}/g' /etc/apache2/sites-available/000-default.conf /etc/apache2/ports.conf

# Set document root and working directory
WORKDIR /var/www/html

# Copy application files
COPY . /var/www/html/

# Install npm dependencies for the streamer
RUN if [ -d "/var/www/html/streamer" ]; then \
        cd /var/www/html/streamer && npm install --production; \
    fi

# Ensure data directory and streamer directory have write permissions for web server (www-data)
RUN mkdir -p /var/www/html/data \
    && chown -R www-data:www-data /var/www/html \
    && chmod -R 775 /var/www/html/streamer /var/www/html/data

# Cloud Run injects $PORT (default 8080)
ENV PORT=8080
EXPOSE 8080

CMD ["apache2-foreground"]
