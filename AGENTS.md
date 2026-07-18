# AI Agent Design

## Manager Agent

Coordinates the AI workflow and decides which specialist agent should handle a request.

## Order Agent

Validates customer orders, creates order records, and updates order statuses.

## Inventory Agent

Monitors stock, reports low-stock items, and supports restocking recommendations.

## Kitchen Agent

Manages the vendor kitchen workflow: Pending, Preparing, Ready, and Completed.

## Business Intelligence Agent

Calculates sales, profit, product performance, and trends from completed orders.

## Business Advisor Agent

Uses the Business Intelligence and Inventory summaries to create concise recommendations. The provider is Qwen using the configured `QWEN_ENDPOINT` and `QWEN_MODEL`.

## Current Status

These agent responsibilities are a Phase 8 refinement. The current Express services already perform the Order, Inventory, and Analytics responsibilities deterministically; Phase 7 adds the Qwen-powered advisor.
