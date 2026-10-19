FROM php:8.2-apache

# Install system dependencies, Node.js, and FFmpeg
RUN apt-get update && apt-get install -y \
    curl \
    git \
    unzip \
    ffmpeg \
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
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && docker-php-ext-install pdo pdo_mysql \
    && a2enmod rewrite \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /var/www/html

# Copy application code
COPY . /var/www/html/

# Install Node.js streamer dependencies
RUN if [ -d "/var/www/html/streamer" ]; then \
        cd /var/www/html/streamer && npm install --production; \
    fi

# Set permissions
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 775 /var/www/html/streamer

EXPOSE 80

CMD ["apache2-foreground"]
