import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { exportSystemData, generateCSV } from './admin';

export interface ExportOptions {
  includeUsers?: boolean;
  includeInvestments?: boolean;
  includeParkingLots?: boolean;
  includeSummary?: boolean;
}

export const exportDataToCSV = async (options: ExportOptions = {
  includeUsers: true,
  includeInvestments: true,
  includeParkingLots: true,
  includeSummary: true
}) => {
  try {
    // Get system data
    const systemData = await exportSystemData();
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const files: { name: string; content: string }[] = [];

    // Generate CSV files based on options
    if (options.includeUsers && systemData.users.length > 0) {
      const usersCSV = generateCSV(systemData.users, 'users');
      files.push({
        name: `users_${timestamp}.csv`,
        content: usersCSV
      });
    }

    if (options.includeInvestments && systemData.investments.length > 0) {
      const investmentsCSV = generateCSV(systemData.investments, 'investments');
      files.push({
        name: `investments_${timestamp}.csv`,
        content: investmentsCSV
      });
    }

    if (options.includeParkingLots && systemData.parkingLots.length > 0) {
      const parkingLotsCSV = generateCSV(systemData.parkingLots, 'parking_lots');
      files.push({
        name: `parking_lots_${timestamp}.csv`,
        content: parkingLotsCSV
      });
    }

    if (options.includeSummary) {
      const summaryData = [{
        'Export Date': systemData.summary.exportedAt,
        'Total Users': systemData.summary.totalUsers,
        'Total Investments': systemData.summary.totalInvestments,
        'Total Parking Lots': systemData.summary.totalParkingLots,
        'Total Investment Amount': systemData.summary.totalInvestmentAmount
      }];
      const summaryCSV = generateCSV(summaryData, 'summary');
      files.push({
        name: `summary_${timestamp}.csv`,
        content: summaryCSV
      });
    }

    if (files.length === 0) {
      throw new Error('No data available to export');
    }

    // If only one file, share it directly
    if (files.length === 1) {
      const file = files[0];
      const fileUri = FileSystem.documentDirectory + file.name;
      
      await FileSystem.writeAsStringAsync(fileUri, file.content, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export System Data',
        });
      } else {
        throw new Error('Sharing is not available on this device');
      }

      return { success: true, message: 'Data exported successfully', filesCreated: 1 };
    }

    // If multiple files, create them all and share the first one
    // (In a real app, you might want to create a ZIP file)
    const createdFiles = [];
    for (const file of files) {
      const fileUri = FileSystem.documentDirectory + file.name;
      await FileSystem.writeAsStringAsync(fileUri, file.content, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      createdFiles.push(fileUri);
    }

    // Share the first file (users data typically)
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(createdFiles[0], {
        mimeType: 'text/csv',
        dialogTitle: 'Export System Data',
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }

    return { 
      success: true, 
      message: `${files.length} files exported successfully`, 
      filesCreated: files.length,
      files: files.map(f => f.name)
    };

  } catch (error: any) {
    console.error('Export error:', error);
    throw new Error(`Failed to export data: ${error.message}`);
  }
};

export const exportUsersOnly = async () => {
  return exportDataToCSV({
    includeUsers: true,
    includeInvestments: false,
    includeParkingLots: false,
    includeSummary: false
  });
};

export const exportInvestmentsOnly = async () => {
  return exportDataToCSV({
    includeUsers: false,
    includeInvestments: true,
    includeParkingLots: false,
    includeSummary: false
  });
};

export const exportParkingLotsOnly = async () => {
  return exportDataToCSV({
    includeUsers: false,
    includeInvestments: false,
    includeParkingLots: true,
    includeSummary: false
  });
};

export const exportAllData = async () => {
  return exportDataToCSV({
    includeUsers: true,
    includeInvestments: true,
    includeParkingLots: true,
    includeSummary: true
  });
};