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

  test.each([
    { value: "FFD8FFDB", type: "image/jpeg" },
    { value: "FFD8FFE0", type: "image/jpeg" },
    { value: "FFD8FFED", type: "image/jpeg" },
    { value: "FFD8FFEE", type: "image/jpeg" },
    { value: "FFD8FFE1", type: "image/jpeg" },
    { value: "FFD8FFE2", type: "image/jpeg" },
    { value: "FFD8XXXX", type: "image/jpeg" },
    { value: "89504E47", type: "image/png" },
    { value: "52494646", type: "image/webp" },
    { value: "49492A00", type: "image/tiff" },
    { value: "4D4D002A", type: "image/tiff" },
    { value: "47494638", type: "image/gif" },
    { value: "000000006674797061766966", type: "image/avif" },
  ])('Should pass if it returns "$type" for a magic number of $value', ({ value, type }) => {
    const byteValues = value.match(/.{1,2}/g).map((x) => parseInt(x, 16));
    const imageBuffer = Buffer.from(byteValues.concat(new Array(8).fill(0x00)));

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);
    const result = imageRequest.inferImageType(imageBuffer);

    // Assert
    expect(result).toEqual(type);
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
