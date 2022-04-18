// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import S3 from "aws-sdk/clients/s3";
import SecretsManager from "aws-sdk/clients/secretsmanager";

import { ImageRequest } from "../../image-request";
import { SecretProvider } from "../../secret-provider";

describe("inferImageType", () => {
  const s3Client = new S3();
  const secretsManager = new SecretsManager();
  const secretProvider = new SecretProvider(secretsManager);

  it('Should pass if it returns "image/jpeg"', () => {
    // Arrange
    const imageBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xee, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);
    const result = imageRequest.inferImageType(imageBuffer);

    // Assert
    expect(result).toEqual("image/jpeg");
  });

  it('Should pass if it returns "image/jpeg for a magic number of FFD8FFED"', () => {
    // Arrange
    const imageBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xed, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);
    const result = imageRequest.inferImageType(imageBuffer);

    // Assert
    expect(result).toEqual("image/jpeg");
  });

  it('Should pass if it returns "image" for an un-know number', () => {
    // Arrange
    const imageBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);
    const result = imageRequest.inferImageType(imageBuffer);
    expect(result).toEqual("image");
  });
});
