// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { consoleInfoSpy } from "../mock";

import S3 from "aws-sdk/clients/s3";
import SecretsManager from "aws-sdk/clients/secretsmanager";

import { ImageRequest } from "../../image-request";
import { RequestTypes, StatusCodes } from "../../lib";
import { SecretProvider } from "../../secret-provider";

describe("parseRequestType", () => {
  const s3Client = new S3();
  const secretsManager = new SecretsManager();
  const secretProvider = new SecretProvider(secretsManager);
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it("Should pass if the method detects a default request", () => {
    // Arrange
    const event = {
      path: "/eyJidWNrZXQiOiJteS1zYW1wbGUtYnVja2V0Iiwia2V5IjoibXktc2FtcGxlLWtleSIsImVkaXRzIjp7ImdyYXlzY2FsZSI6dHJ1ZX19",
    };
    process.env = {};

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);
    const result = imageRequest.parseRequestType(event);

    // Assert
    const expectedResult = RequestTypes.DEFAULT;
    expect(result).toEqual(expectedResult);
  });

  it("Should pass if the method detects a thumbor request", () => {
    // Arrange
    const event = {
      path: "/unsafe/filters:brightness(10):contrast(30)/https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Coffee_berries_1.jpg/1200px-Coffee_berries_1.jpg",
    };
    process.env = {};

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);
    const result = imageRequest.parseRequestType(event);

    // Assert
    expect(consoleInfoSpy).toHaveBeenCalledWith("Path is not base64 encoded.");
    expect(result).toEqual(RequestTypes.THUMBOR);
  });

  it("Should pass for a thumbor request with extension", () => {
    // Arrange
    const event = {
      path: "/unsafe/filters:brightness(10):contrast(30)/image.jpg",
    };
    process.env = {};

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);
    const result = imageRequest.parseRequestType(event);

    // Assert
    expect(consoleInfoSpy).toHaveBeenCalledWith("Path is not base64 encoded.");
    expect(result).toEqual(RequestTypes.THUMBOR);
  });

  test.each([
    { value: ".jpg" },
    { value: ".jpeg" },
    { value: ".png" },
    { value: ".webp" },
    { value: ".tiff" },
    { value: ".tif" },
    { value: ".svg" },
    { value: ".gif" },
    { value: ".avif" },
  ])("Should pass if get a request with supported image extension: $value", ({ value }) => {
    process.env = {};

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);
    const result = imageRequest.parseRequestType({ path: `image${value}` });

    // Assert
    expect(result).toEqual(RequestTypes.THUMBOR);
  });

  it("Should pass if the method detects a custom request", () => {
    // Arrange
    const event = { path: "/additionalImageRequestParameters/image.jpg" };
    process.env = {
      REWRITE_MATCH_PATTERN: "matchPattern",
      REWRITE_SUBSTITUTION: "substitutionString",
    };

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);
    const result = imageRequest.parseRequestType(event);

    // Assert
    const expectedResult = RequestTypes.CUSTOM;
    expect(result).toEqual(expectedResult);
  });

  it("Should throw an error if the method cannot determine the request type based on the three groups given", () => {
    // Arrange
    const event = { path: "12x12e24d234r2ewxsad123d34r.bmp" };

    process.env = {};

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);

    let parseError;
    // Assert
    try {
      imageRequest.parseRequestType(event);
    } catch (error) {
      expect(consoleInfoSpy).toHaveBeenCalledWith("Path is not base64 encoded.");
      expect(error).toMatchObject({
        status: StatusCodes.TRUNCATED_REQUEST,
        code: "DecodeRequest::CannotDecodeRequest",
        message:
            "The image request you provided could not be decoded. Please check that your request is base64 encoded properly and refer to the documentation for additional guidance.",
      });
    }
  });

  it("Should throw an error for a thumbor request with invalid extension", () => {
    // Arrange
    const event = {
      path: "/testImage.abc",
    };
    process.env = {};

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);
    let parseError;
    // Assert
    try {
      imageRequest.parseRequestType(event);
    } catch (error) {
      expect(error).toMatchObject({
        status: StatusCodes.TRUNCATED_REQUEST,
        code: "DecodeRequest::CannotDecodeRequest",
        message:
          "The image request you provided could not be decoded. Please check that your request is base64 encoded properly and refer to the documentation for additional guidance.",
      });
    }
  });

  it("Should throw an error if the request is a truncated base64", () => {
    // Arrange
    const event = { path: "ewogICJidWNrZXQiOiAidHQtb3JpZ2luYWwtaW1hZ2UtYnVja2V0IiwKICAia2V5" };

    process.env = {};

    // Act
    const imageRequest = new ImageRequest(s3Client, secretProvider);

    // Assert
    try {
      imageRequest.parseRequestType(event);
    } catch (error) {
      expect(consoleInfoSpy).toHaveBeenCalledWith("Path is not base64 encoded.");
      expect(error).toMatchObject({
        status: StatusCodes.TRUNCATED_REQUEST,
        code: "DecodeRequest::CannotDecodeRequest",
        message:
          "The image request you provided could not be decoded. Please check that your request is base64 encoded properly and refer to the documentation for additional guidance.",
      });
    }
  });
});
