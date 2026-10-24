# =============================================================================
# Oath of Care Pharmacy Platform — Backend API Dockerfile (Render / Linux x64)
# Multi-stage Java 21 build with non-root security hardening
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Build Stage (JDK 21 + Maven)
# -----------------------------------------------------------------------------
FROM maven:3.9.9-eclipse-temurin-21-jammy AS builder

WORKDIR /build

# Copy Maven POM
COPY backend/pom.xml ./backend/pom.xml

# Copy backend source code and the Supabase migrations referenced by pom.xml
# pom.xml copies: <directory>../supabase/migrations</directory> -> <targetPath>db/migration</targetPath>
COPY backend/src ./backend/src
COPY supabase/migrations ./supabase/migrations

# Compile and package executable Spring Boot jar
RUN mvn -f backend/pom.xml clean package -DskipTests --batch-mode --no-transfer-progress

# -----------------------------------------------------------------------------
# Stage 2: Runtime Stage (Lightweight JRE 21)
# -----------------------------------------------------------------------------
FROM eclipse-temurin:21-jre-jammy AS runner

# Create dedicated non-root application user and group
RUN groupadd -r appgroup && useradd -r -g appgroup -s /sbin/nologin -d /app appuser

WORKDIR /app

# Copy executable jar from builder stage with strict ownership
COPY --from=builder --chown=appuser:appgroup /build/backend/target/pharmacy-api-0.1.0.jar /app/pharmacy-api.jar

# Switch to unprivileged non-root user
USER appuser:appgroup

# Render assigns a dynamic port via $PORT (defaults to 8080)
ENV PORT=8080
ENV JAVA_OPTS="-XX:+UseG1GC -XX:MaxRAMPercentage=75.0 -Djava.security.egd=file:/dev/./urandom"

EXPOSE 8080

# Use exec to ensure signals (SIGTERM/SIGINT) reach Spring Boot for graceful shutdown
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -Dserver.port=${PORT:-8080} -jar /app/pharmacy-api.jar"]
