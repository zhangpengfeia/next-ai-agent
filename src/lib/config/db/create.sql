create database ai_agent;
USE ai_agent;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- 1. 文件 MD5 去重表（核心：替代本地存储）
-- ----------------------------
DROP TABLE IF EXISTS `file_md5_record`;
CREATE TABLE `file_md5_record`  (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `md5` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '文件MD5',
  `file_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '原始文件名',
  `chroma_collection` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '对应的chroma集合',
  `chroma_ids` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '向量库ID列表',
  `create_time` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `idx_md5`(`md5`) USING BTREE
) ENGINE = InnoDB COMMENT = '文件MD5去重表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- 2. 会话表（AI 聊天窗口/会话）
-- ----------------------------
DROP TABLE IF EXISTS `chat_session`;
CREATE TABLE `chat_session`  (
  `session_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `session_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT '新会话',
  `create_time` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  `update_time` datetime NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`session_id`) USING BTREE
) ENGINE = InnoDB COMMENT = '聊天会话表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- 3. 聊天消息历史表（核心记忆）
-- ----------------------------
DROP TABLE IF EXISTS `chat_message`;
CREATE TABLE `chat_message`  (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `session_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `role` enum('user','assistant') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `use_rag` tinyint(1) NULL DEFAULT 0 COMMENT '是否使用了知识库',
  `md5` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '关联文件MD5',
  `create_time` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `idx_session`(`session_id`) USING BTREE
) ENGINE = InnoDB COMMENT = '聊天消息表' ROW_FORMAT = Dynamic;

-- ----------------------------
-- 4. 向量知识库配置表
-- ----------------------------
DROP TABLE IF EXISTS `kb_config`;
CREATE TABLE `kb_config`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `kb_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `chroma_collection` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `create_time` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `idx_collection`(`chroma_collection`) USING BTREE
) ENGINE = InnoDB COMMENT = '知识库配置' ROW_FORMAT = Dynamic;

SET FOREIGN_KEY_CHECKS = 1;