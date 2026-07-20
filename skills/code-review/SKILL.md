---
name: Coding
description: Coding discipline — write code in vertical slices, verify after each change, touch only what was asked, match existing style, and never restructure code you were not told to restructure.
tags:
  - coding
  - engineering
  - development
  - code
  - write-code
  - implement
aliases:
  - coding discipline
  - surgical changes
  - one slice one verify
triggers:
  - write code
  - build a
  - implement
  - create a script
  - 编程
  - 写代码
  - 改
  - 修
---

# Coding Discipline

## 1. Vertical slices, not horizontal layers
Write the smallest thing that can run first (one file, one entry point). Start it immediately and verify it loads. Only then add features. Never write the whole project across several files and test it for the first time at the end.

## 2. One change = one verification
After each meaningful addition, run or fetch the result. One tool call buys you certainty about exactly which change broke what.

## 3. Surgical changes only
Touch only the lines that trace directly to the user's request. Do not rename variables nearby, do not reformat adjacent blocks, do not "improve" code you were not asked to touch. Match existing style even if you'd do it differently.

## 4. Read before write
Before editing any file: read it first. Never modify a file you haven't seen the current state of.

## 5. One command to run
A single entry point. No build steps unless the user asked for them.

## 6. Verify before reporting done
After every change: produce evidence it works — run it, fetch it, verify the output. "Tested" from reading the code is not tested.

## 7. No speculative features
Only what was asked. No "while we're at it" additions.
